"use strict";

const cli = require('cli');
const ws = require('ws');

const utility = require('./utility');

const config = require('./config.json');

let socket, processor;
module.exports = (dbWriteFreqInSeconds, url, configUpdated) => {
    const local = url === void 0 || url === null;
    if (local) {
		processor = require('./processor');
		cli.debug(`writing db every ${dbWriteFreqInSeconds} seconds`);
		processor.updateConfig(config);
		processor.initializeProcessor(dbWriteFreqInSeconds);
	    if (typeof configUpdated == 'function') {
		    configUpdated({
		        event: 'config-update',
		        data: require('./config.json')
		    });
	    }
		cli.debug('processing events locally');
    }
    else {
        cli.debug(`sending events to ${url}`);
        connectSocket(url, configUpdated);
    }
    let notOpenedReported = false;
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
		        cli.error('socket is not defined');
		        return;
		    }
		    if (socket.readyState != 1 && !notOpenedReported) {
		    	notOpenedReported = true
		        cli.error(`socket not open - readyState: ${socket.readyState}`);
		        return;
		    }
		    notOpenedReported = false;
		    socket.send(JSON.stringify(evt));
		}
	}
	handle.processor = processor;
	return handle;
};

function connectSocket(url, serverEventListener) {
    let reconnecting;
    if (socket === void 0 || socket.readyState != 1) {
    	let opening;
        socket = new ws(url);
        socket.on('open', () => {
        	clearTimeout(opening);
            clearInterval(reconnecting);
            cli.info('socket connected');
        }).on('close', () => {
        	clearTimeout(opening);
            reconnecting = setTimeout(() => {
                cli.error('socket closed - attempting reconnect...');
                connectSocket(url, serverEventListener);
            }, 5000);
        }).on('message', (msg) => {
        	utility.parseJson(msg, (e, serverEvent) => {
        		if (e == null) {
        		    if (typeof serverEventListener == 'function') {
        			    serverEventListener(serverEvent);
        		    }
        		}
        		else {
        			cli.error(e);
        		}
        	});
        }).on('error', (e) => {
            cli.error(e);
        });
        opening = setTimeout(() => {
        	if (socket.readyState == 0) {
                cli.error('socket never connected - attempting reconnect...');
                connectSocket(url, serverEventListener);
        	}
        }, 5000);
    }
}
