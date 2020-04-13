const jimp = require('jimp');
process.on('message', (path) => jimp.read(path).then((img) => {
	const h = {};

	img.scan(0, 0, img.bitmap.width, img.bitmap.height, (x, y, idx) => {
		const values = {
			r: img.bitmap.data[idx + 0],
			g: img.bitmap.data[idx + 1],
			b: img.bitmap.data[idx + 2]
		};

		const max = Math.max(values.r, values.g, values.b);
		const min = Math.min(values.r, values.g, values.b);

		values.s = (max > 0) ? Math.round((max - min) / max * 255) : 0;
		values.v = max;

		Object.entries(values).forEach(([key, value]) => {
			if (!h[key]) h[key] = new Array(256).fill(0);
			h[key][value]++;
		});
	});

	const pixelCount = img.bitmap.width * img.bitmap.height;
	Object.keys(h).forEach((key) => {
		h[key] = h[key].map((v) => v / pixelCount)
	});

	process.send(h);

	process.exit();
}));
