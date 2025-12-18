#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const util = require('util');
const watch = require('./lib/watch.js');

async function start (args) {
	// start watching scandir
	args.scanDirWatch = watch(args.scanDir);

	// load all services
	const files = fs.readdirSync(path.join(__dirname, 'services'));
	const services = files.map((file) => require(`./services/${file}`));

	// start all services
	const exit = await Promise.all(services.map((service) => service(args)));

	// return exit handler
	return () => {
		exit.filter((e) => typeof e === 'function').forEach((e) => e());
		args.scanDirWatch.destroy();
	}
}

const scanDir = process.env.SCANDIR || 'scans';
const scannerType = process.env.SCANNERTYPE || 'ix500';
const scanArgs = require(`./scanner/${scannerType}.js`);
const uiPort = process.env.UIPORT ? parseInt(process.env.UIPORT) : 8081;
start({scanDir, scannerType, scanArgs, uiPort}).then((exit) => {
	// call exit handler on signals TERM and INT
	process.on('SIGTERM', exit).on('SIGINT', exit);
}).catch((err) => console.error(err));
