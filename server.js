"use strict";

const http = require('http');
const path = require('path');
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
            let route = req.url.split('/').slice(1);
            if (route.length == 1 && route[0].length == 0) {
                route = [ 'index.html' ];
            }
            switch (route[0]) {
                case 'api':
                    switch (route[1]) {
                        case 'data':   
                            switch (route[2]) {
                                case void 0:
                                case '':
                                    switch (req.method) {
                                        case 'GET':
                                            serveFile(res, './db.json');
                                            break;
                                        case 'DELETE':
                                            event.processor.initializeDb((e) => {
                                                if (e != null) {
                                                    cli.error(e);
                                                    sendCode(res, 500);
                                                }
                                                else {
                                                    res.end();
                                                }
                                            });
                                            break;
                                        default:
                                            send405(res, 'GET, DELETE');
                                            break;
                                    }
                                    break;
                                case 'archive':
                                    switch (route[3]) {
                                        case void 0:
                                        case '':
                                            switch (req.method) {
                                                case 'POST':
                                                    
                                                    parseBody(req, (body) => {
                                                        console.log(body);
                                                    });
                                                    
                                                    // event.processor.archiveDb(name, (e) => {
                                                    //     if (e != null) {
                                                    //         cli.error(e);
                                                    //         sendCode(res, 500);
                                                    //     }
                                                    //     else {
                                                    //         res.end();
                                                    //     }
                                                    // });
                                                    break;
                                                default:
                                                    send405(res, 'POST');
                                                    break;
                                            }
                                            break;
                                        default:
                                            switch (req.method) {
                                                case 'GET':
                                                    serveFile(res, path.join(path.resolve('./archive'), `${route[3]}.json`));
                                                    break;
                                                default:
                                                    send405(res, 'GET');
                                                    break;
                                            }
                                            break;
                                    }
                                    break;
                                default:
                                    sendCode(res, 404);
                                    break;
                            }
                            break;
                        case 'config':
                            switch (req.method) {
                                case 'GET':
                                    serveFile(res, './config.json');
                                    break;
                                case 'PUT':
                                    parseJsonBody(req, res, (config) => {
                                        event.processor.updateConfig(config);
                                        fs.writeFileSync('./config.json', JSON.stringify(config, null, '\t'));
                                        res.end();
                                    });
                                    break;
                                default:
                                    send405(res, 'GET, DELETE');
                                    break;
                            }
                            break;
                        default:
                            sendCode(res, 404);
                            break;
                    }
                    break;
                default:
                    serveFile(res, `./dist/${route.join('/')}`);
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
    
    function parseJsonBody(req, res, cb) {
        if (req.headers['content-type'] == 'application/json') {
            parseBody(req, (json) => {
                
                console.log(json);
                
                utility.parseJson(json, (e, obj) => {
                    if (e === null) {
                        cb(obj);
                    }
                    else {
                        sendCode(res, 400);
                    }
                });
            });
        }
        else {
            res.setHeader('accepts', 'application/json');
            sendCode(res, 415);
        }
    }
    
    function parse
    
    function parseBody(req, cb) {
        let body = '';
        req.setEncoding('utf8');
        req.on('data', (data) => {
            body += data;
        });
        req.on('end', () => {
            cb(body);
        });
    }
    
    function serveFile(res, filepath) {
        filepath = path.resolve(filepath);
        if (fs.existsSync(filepath)) {
            switch (path.extname(filepath)) {
                case '.json':
                    res.setHeader('Content-Type', 'application/json');
                    break;
                case '.js':
                    res.setHeader('Content-Type', 'application/js');
                    break;
                case '.css':
                    res.setHeader('Content-Type', 'text/css');
                    break;
            }
            fs.readFile(filepath, (e, buf) => {
                if (e == null) {
                    res.setHeader('Content-length', buf.length);
                    res.end(buf.toString('utf8'));
                }
                else {
                    cli.error(e);
                    sendCode(res, 500);
                }
            });
        }
        else {
            sendCode(res, 404);
        }
    }
    
    function sendCode(res, code) {
        res.statusCode = code;
        res.end();
    }
    
    function send405(res, allowed) {
        res.setHeader('Allow', allowed);
        sendCode(res, 405)
    }
};
