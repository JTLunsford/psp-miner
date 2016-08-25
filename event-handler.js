"use strict";

const cli = require('cli');
const ws = require('ws');

let socket;
module.exports = (url) => {
    const local = url === void 0 || url === null;
    if (local) {
        cli.debug('processing events locally');
    }
    else {
        cli.debug(`sending events to ${url}`);
        connectSocket(url);
    }
	return (evt) => {
		if (local) {
		    const processor = require('./processor');
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
	};
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
