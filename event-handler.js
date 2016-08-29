"use strict";

const cli = require('cli');
const ws = require('ws');

let socket, processor;
module.exports = (dbWriteFreqInSeconds, url) => {
    const local = url === void 0 || url === null;
    if (local) {
		processor = require('./processor');
		cli.debug(`writing db every ${dbWriteFreqInSeconds} seconds`);
		processor.initializeProcessor(dbWriteFreqInSeconds);
		cli.debug('processing events locally');
    }
    else {
        cli.debug(`sending events to ${url}`);
        connectSocket(url);
    }
    function handle(evt) {
		if (local) {
		    if (evt instanceof Array) {
		        for (const e of evt) {
		            processor(e);
		        }
		    }
		    else {
		        processor(evt);
		    }
		}
		else {
		    if (socket === void 0) {
		        cli.debug('socket is not defined');
		        return;
		    }
		    if (socket.readyState != 1) {
		        cli.debug(`socket not open - readyState: ${socket.readyState}`);
		        return;
		    }
		    socket.send(JSON.stringify(evt));
		}
	}
	handle.processor = processor;
	return handle;
};

function connectSocket(url) {
    let reconnecting;
    if (socket === void 0 || socket.readyState > 1) {
        socket = new ws(url);
        socket.on('open', () => {
            clearInterval(reconnecting);
            cli.debug('socket connected');
        }).on('close', () => {
            reconnecting = setTimeout(() => {
                cli.debug('attempting reconnect...')
                connectSocket(url);
            }, 5000);
        }).on('error', (e) => {
            cli.error(e);
        });
    }
}
