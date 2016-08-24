const cli = require('cli');

const config = require('./config.json');

const miner = require('./miner');

cli.enable('version').enable('status');

cli.parse(miner.opts);

cli.main((args, opts) => {
	miner.load(args, opts);
});
