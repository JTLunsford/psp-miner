"use strict";

const http = require('http');
const fs = require('fs');

const cli = require('cli');
const ws = require('ws');

const utility = require('./utility');

exports.opts = {
    "db-write-freq":    [false, 'frequency, in seconds, to write db.json', 'int', 30]
};


exports.load = (args, opts, cb) => {
    const event = require('./event-handler')(opts['db-write-freq']);
    new ws.Server({
        server: http.createServer((req, res) => {
            switch (req.url) {
                case '/config.json':
                    if (req.method === 'GET') {
                        res.setHeader('Content-Type', 'application/json');
                        res.end(fs.readFileSync('./config.json', 'utf8'));
                    }
                    else {
                        res.setHeader('Allow', 'GET');
                        res.statusCode = 405;
                        res.end();
                    }
                    break;
                case '/api/data':
                    if (req.method === 'GET') {
                        res.setHeader('Content-Type', 'application/json');
                        res.end(fs.readFileSync('./db.json', 'utf8'));
                    }
                    else {
                        res.setHeader('Allow', 'GET');
                        res.statusCode = 405;
                        res.end();
                    }
                    break;
                case '/api/clear-db':
                    if (req.method === 'DELETE') {
                        event.processor.initializeDb((e) => {
                            if (e != null) {
                                res.statusCode = 500;
                            }
                            res.end();
                        });
                    }
                    else {
                        res.setHeader('Allow', 'DELETE');
                        res.statusCode = 405;
                        res.end();
                    }
                    break;
                case '/':
                    res.end();
                    break;
                default:
                    res.statusCode = 404;
                    res.end();
                    break;
            }
        }).listen(process.env.PORT, 
            () => {
                cli.info(`server listening on ${process.env.PORT}...`);
            }
        )
    }).on('connection', (socket) => {
        socket.on('message', (msg) => {
            utility.parseJson(msg, (e, obj) => {
                if (e === null) {
                    event(obj);
                }
                else {
                    let eDesc = 'UNKNOWN SOCKET MESSAGE ERROR';
                    if (e instanceof SyntaxError) {
                        eDesc = 'SOCKET MESSAGE MALFORMED JSON';
                    }
                    cli.error(`${eDesc}:\n`, e.stack);
                }
            });
        });
        socket.on('error', (e) => {
            cli.error(`SOCKET CLIENT ERROR:\n${e.stack}`);
        });
    }).on('error', (e) => {
        cli.error(`SOCKET SERVER ERROR:\n${e.stack}`);
    });
};
