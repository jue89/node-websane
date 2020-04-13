const path = require('path');
const http = require('http');
const fs = require('fs');
const util = require('util');
const express = require('express');
const bodyParser = require('body-parser');
const socketio = require('socket.io');
const esModuleMiddleware = require('@adobe/es-modules-middleware');
const exec = require('../lib/exec.js');

const unlink = util.promisify(fs.unlink);

module.exports = ({scanDir, scanDirWatch, uiPort}) => {
	const app = express();
	const server = http.createServer(app);
	const io = socketio(server);
	app.use(bodyParser.json());

	// serve scans
	app.use('/scans', express.static(scanDir));
	scans = [];
	scanDirWatch.on('add', async (filePath) => {
		if (filePath.substr(-5) !== '.tiff') return;
		await scanDirWatch.existance(filePath + '.preview.jpg');
		await scanDirWatch.existance(filePath + '.meta.json');
		const scan = filePath.substr(0, filePath.length - 5)
		scans.push(scan);
		io.emit('scan-add', scan);
		console.log('ui: add scan', scan);
	}).on('remove', (filePath) => {
		if (filePath.substr(-5) !== '.tiff') return;
		const scan = filePath.substr(0, filePath.length - 5)
		scans = scans.filter((s) => s !== scan);
		io.emit('scan-remove', scan);
		console.log('ui: remove scan', scan);
	});
	io.on('connection', (socket) => {
		scans.forEach((path) => socket.emit('scan-add', path));
	});

	// serve index.html and assets
	app.get('/', (req, res) => res.sendFile(path.join(__dirname, '../ui/index.html')));
	app.use(esModuleMiddleware.middleware({paths: {
		'/components': path.join(__dirname, '../ui/components'),
		'/node_modules': path.join(__dirname, '../ui/node_modules')
	}}));

	// delete action
	app.post('/actions/delete', (req, rsp) => {
		Promise.all(scanDirWatch.ls().filter((p) => {
			for (let needle of req.body) {
				if (p.substr(0, needle.length) === needle) return true;
			}
		}).map((p) => unlink(path.join(scanDir, p)))).then(() => {
			rsp.end();
		}).catch((err) => {
			rsp.status(500).end();
			console.error(err);
		});
	});

	server.listen(uiPort);

	return () => server.close();
};
