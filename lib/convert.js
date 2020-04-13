const exec = require('./exec.js');
module.exports = (src, dst, args, cwd) => exec('convert', [src, ...args, dst], cwd).then(() => dst);
