"use strict";

const http = require('http');

const ws = require('ws');

const event = require('./event-handler')();

new ws.Server({
    server: http.createServer().listen(process.env.PORT, 
        () => {
            console.log(`server listening on ${process.env.PORT}...`);
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
