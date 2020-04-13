const fs = require('fs');
const path = require('path');
const util = require('util');
const readdir = util.promisify(fs.readdir);

async function start (args) {
	// load all services
	const files = await readdir(path.join(__dirname, 'services'));
	const services = files.map((file) => require(`./services/${file}`));

	// start all services
	const exit = await Promise.all(services.map((service) => service(args)));

	// return exit handler
	return () => exit.filter((e) => typeof e === 'function').forEach((e) => e());
}

const scanDir = process.env.SCANDIR || 'scans';
const scannerType = process.env.SCANNERTYPE || 'ix500';
const scanArgs = require(`./scanner/${scannerType}.js`);
start({scanDir, scannerType, scanArgs}).then((exit) => {
	// call exit handler on signals TERM and INT
	process.on('SIGTERM', exit).on('SIGINT', exit);
}).catch((err) => console.error(err));
