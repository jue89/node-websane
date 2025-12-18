const exec = require('./exec.js');

const bin = process.env.CONVERT_BIN || 'convert';

// check if scanimage executable is present
exec(bin, ['-version'], __dirname);

module.exports = (src, dst, args, cwd) => exec(bin, [src, ...args, dst], cwd).then(() => dst);
