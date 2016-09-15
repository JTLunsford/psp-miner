"use strict";

const cli = require('cli');
const ws = require('ws');
const request = require('request');

const utility = require('./utility');

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
	handle.downloadConfig = (cb) => {
		const configUrl = `${url}/config.json`;
		cli.debug(`downloading config from ${configUrl}`)
		request.get(configUrl).on('response', (res) => {
		  	if (res.statusCode === 200) {
		  		let body = "";
		  		res.setEncoding('utf8');
		  		res.on('data', (data) => {
		  			body += data;
		  		});
		  		res.on('end', () => {
	            	utility.parseJson(body, cb);
		  		});
		  	}
		  	else {
		  		cb(`ERROR DOWNLOADING CONFIG: HTTP GET ${configUrl} -> ${res.statusCode} - ${res.statusMessage}`);
		  	}
		  });
	};
	return handle;
};

function connectSocket(url) {
    let reconnecting;
    if (socket === void 0 || socket.readyState != 1) {
    	let opening;
        socket = new ws(url);
        socket.on('open', () => {
        	clearTimeout(opening);
            clearInterval(reconnecting);
            cli.debug('socket connected');
        }).on('close', () => {
        	clearTimeout(opening);
            reconnecting = setTimeout(() => {
                cli.debug('socket closed - attempting reconnect...');
                connectSocket(url);
            }, 5000);
        }).on('error', (e) => {
            cli.error(e);
        });
        opening = setTimeout(() => {
        	if (socket.readyState == 0) {
                cli.debug('socket never connected - attempting reconnect...');
                connectSocket(url);
        	}
        }, 5000);
    }
}
