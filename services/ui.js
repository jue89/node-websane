const path = require('path');
const http = require('http');
const fs = require('fs');
const util = require('util');
const express = require('express');
const bodyParser = require('body-parser');
const socketio = require('socket.io');
const qsem = require('qsem');
const esModuleMiddleware = require('@adobe/es-modules-middleware');
const exec = require('../lib/exec.js');
const {PDFDocument, degrees, toRadians} = require('pdf-lib');

const unlink = util.promisify(fs.unlink);
const readFile = util.promisify(fs.readFile);

const PPI = 72;
const DPI = 300;

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

	const actionSem = qsem(1);

	// delete action
	app.post('/actions/delete', (req, rsp) => actionSem.limit(async () => {
		const deleteFiles = scanDirWatch.ls().filter((filePath) => {
			for (const {p} of req.body.pages) {
				if (filePath.substr(0, p.length) === p) return true;
			}
		});
		for (const filePath of deleteFiles) {
			await unlink(path.join(scanDir, filePath));
		}
	}).catch((err) => {
		console.error(err);
		rsp.status(500);
	}).then(() => {
		rsp.end();
	}));

	// PDF action
	app.post('/actions/pdf', (req, rsp) => actionSem.limit(async () => {
		const pdfDoc = await PDFDocument.create();
		const addPage = async (filePath, resolution, rotate) => {
			const imgData = await readFile(path.join(scanDir, filePath));
			const img = await pdfDoc.embedJpg(imgData);
			const width = img.width / resolution * PPI;
			const height = img.height / resolution * PPI;
			const pBase = [
				[    0,      0],
				[width,      0],
				[width, height],
				[    0, height]
			];
			const cos = Math.cos(toRadians(rotate));
			const sin = Math.sin(toRadians(rotate));
			const pRotated = pBase.map(([x, y]) => [x * cos - y * sin, y * cos + x * sin]);
			const [minx, miny] = pRotated.reduce(([minx, miny], [x, y]) => [Math.min(x, minx), Math.min(y, miny)], [Number.MAX_VALUE, Number.MAX_VALUE]);
			const pTranslated = pRotated.map(([x, y]) => [x - minx, y - miny]);
			const [pwidth, pheight] = pTranslated.reduce(([maxx, maxy], [x, y]) => [Math.max(x, maxx), Math.max(y, maxy)], [Number.MIN_VALUE, Number.MIN_VALUE]);
			const [x, y] = pTranslated[0];
			pdfDoc.addPage([pwidth, pheight]).drawImage(img, {x, y, width, height, rotate});
		};

		// add pages
		const {pages} = req.body;
		for (const {p, r} of pages) {
			const filePath = p + '.tiff.color.jpg';
			await scanDirWatch.existance(filePath);
			await addPage(filePath, DPI, degrees(r));
		}

		// download pdf
		rsp.attachment('out.pdf').write(Buffer.from(await pdfDoc.save()));
	}).catch((err) => {
		console.error(err);
		rsp.status(500);
	}).then(() => {
		rsp.end();
	}));


	server.listen(uiPort);

	return () => server.close();
};
