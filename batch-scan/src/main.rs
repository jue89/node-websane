mod time;

use sane_scan::{DeviceHandle, DeviceOptionValue, Sane};
use signal_hook::{consts::SIGUSR1, iterator::Signals};
use std::{
    env,
    ffi::CString,
    fs::{DirBuilder, File, rename},
    path::PathBuf,
    str::FromStr,
    sync::mpsc,
    thread::{self, sleep},
    time::{Duration, SystemTime},
};
use tiff::encoder::{TiffEncoder, colortype::RGB8};

fn configure_scanner(dev: &DeviceHandle, opts: &str) {
    let available_opts = dev.get_options().expect("Cannot read options");

    for item in opts.split(",") {
        // Get key value pairs
        let mut item = item.split("=");
        let Some(key) = item.next() else {
            continue;
        };
        let Some(value) = item.next() else {
            continue;
        };

        // Find option
        let key = CString::from_str(key).expect("Invalid option string");
        let Some(opt) = available_opts.iter().find(|x| x.name == key) else {
            println!("Cannot find option {:?}", key);
            continue;
        };

        let value = DeviceOptionValue::from_str(opt, value);
        dev.set_option(opt, value).expect("Cannot set option");
    }
}

const TMP_FILE: &str = "scan.tiff.part";

fn main() {
    let scanner_name = env::var("SCANNER_NAME").expect("Env SCANNER_NAME");
    let scanner_opts = env::var("SCANNER_OPTS").expect("Env SCANNER_OPTS");
    let scanner_button = env::var("SCANNER_BUTTON").expect("Env SCANNER_BUTTON");

    let sane = Sane::init_1_0().expect("Cannot configure sane backend");

    // Open device
    let mut dev = sane
        .open_device_by_name(scanner_name.as_str())
        .expect("Cannot open scanner");

    // Find scanner button option
    let scanner_button = CString::from_str(scanner_button.as_str()).expect("Invalid button name");
    let scanner_button = dev
        .get_options()
        .expect("Cannot read options")
        .into_iter()
        .find(|x| x.name == scanner_button)
        .expect("Cannot get scanner button option");

    // Configure scanner
    configure_scanner(&dev, scanner_opts.as_str());

    // Start signal listener
    let (usr1_tx, usr1_rx) = mpsc::channel();
    let mut signals = Signals::new(&[SIGUSR1]).expect("Cannot install signal handler");
    thread::spawn(move || {
        for _ in signals.forever() {
            if usr1_tx.send(()).is_err() {
                break;
            }
        }
    });

    loop {
        // Read scanner button
        let val = dev
            .get_option(&scanner_button)
            .expect("Cannot get state of scanner button");
        if !matches!(val, DeviceOptionValue::Bool(true)) && usr1_rx.try_recv().is_err() {
            sleep(Duration::from_millis(100));
            continue;
        }

        let date = time::system_time_to_string(SystemTime::now());
        println!("start scan {} ...", date);

        // Create scan dir
        let basedir = PathBuf::new().join(&date);
        DirBuilder::new()
            .create(&basedir)
            .expect("Cannot create dir");

        let tmp_file_path = basedir.join(TMP_FILE);

        let mut no = 0;
        let mut scan = dev.start_scan();
        while let Ok(mut image) = scan.next_image()
            && let Ok(data) = image.read_to_vec()
            && data.len() > 0
        {
            println!("next page: {:?} {:?}", image.parameters, data.len());
            assert!(
                matches!(image.parameters.format, sane_scan::Frame::Rgb),
                "Format must be Rgb!"
            );
            assert_eq!(image.parameters.depth, 8, "Depth must be 8!");

            // Write file
            let tmp_file = File::create(&tmp_file_path).expect("Cannot create tmp file");
            TiffEncoder::new(tmp_file)
                .expect("Cannot open tiff file for writing")
                .write_image::<RGB8>(
                    image.parameters.pixels_per_line as u32,
                    image.parameters.lines as u32,
                    &data,
                )
                .expect("Cannot write tiff file");

            // Rename file
            let scan_file_name = format!("{:04}.tiff", no);
            let scan_file_path = basedir.join(&scan_file_name);
            rename(&tmp_file_path, &scan_file_path).expect("Cannot rename scan");

            no += 1;
        }
    }
}
