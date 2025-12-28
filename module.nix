{ config, lib, pkgs, ... }: with lib; let
  cfg = config.services.websane;
  opts = {
    enable = mkOption {
      type = types.bool;
      default = false;
      description = "Enable Websane";
    };
    port = mkOption {
      type = types.port;
      description = "Port to listen on";
      default = 8080;
    };
    scandir = mkOption {
      type = types.path;
      description = "Scan directory";
      default = "/tmp/scans";
    };
  };
  websane = import ./websane pkgs;
  batch-scan = import ./batch-scan pkgs;
in {
  options.services.websane = opts;

  config = mkIf cfg.enable {
    systemd.services = {
      websane = {
        preStart = "mkdir -p ${cfg.scandir}";
        environment = {
          UIPORT = toString cfg.port;
          CONVERT_BIN = "${pkgs.imagemagick}/bin/convert";
          SCANDIR = cfg.scandir;
        };
        script = "${websane}/bin/websane";
        wantedBy = [ "multi-user.target" ];
      };

      batch-scan = {
        preStart = "mkdir -p ${cfg.scandir}";
        environment = {
          SCANNER_NAME = "fujitsu:ScanSnap iX500:53474";
          SCANNER_OPTS = "resolution=300,page-height=297.0,mode=Color,source=ADF Duplex,page-width=205";
          SCANNER_BUTTON = "scan";
        };
        script = "${batch-scan}/bin/batch-scan";
        serviceConfig.WorkingDirectory = cfg.scandir;
      };
    };

    services.udev.extraRules = ''
      ACTION=="add", ENV{libsane_matched}=="yes", TAG+="systemd", ENV{SYSTEMD_WANTS}+="batch-scan.service"
    '';

    hardware.sane.enable = true;
  };
}
