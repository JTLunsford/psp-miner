"use strict";

const http = require('http');

const ws = require('ws');

const event = require('./event-handler')();

const port = process.argv[2] !== void 0 ? process.argv[2] : require('./package.json').port;
new ws.Server({
    server: http.createServer().listen(port, () => {
            console.log(`server listening on ${port}...`);
        }
    )
}).on('connection', (socket) => {
    socket.on('message', (msg) => {
        let obj;
        try {
            obj = JSON.parse(msg);
        }
        catch (e) {
            let eDesc = 'UNKNOWN SOCKET MESSAGE ERROR';
            if (e instanceof SyntaxError) {
                eDesc = 'SOCKET MESSAGE MALFORMED JSON';
            }
            console.error(`${eDesc}:\n`, e.stack);
        }
        if (obj !== void 0) {
            event(obj);
        }
    });
    socket.on('error', (e) => {
        console.error('SOCKET CLIENT ERROR:\n', e.stack);
    });
}).on('error', (e) => {
    console.error('SOCKET SERVER ERROR:\n', e.stack);
});
