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
    const archivePath = path.resolve('./archive');
    if (!fs.existsSync(archivePath)) {
        fs.mkdirSync(archivePath);
    }
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
                                        case '':
                                            switch (req.method) {
                                                case 'POST':
                                                    sendCode(res, 501);
                                                    break;
                                                default:
                                                    send405(res, 'POST');
                                                    break;
                                            }
                                            break;
                                        default:
                                            switch (req.method) {
                                                case 'GET':
                                                    serveFile(res, path.join(archivePath, `${route[3]}.json`));
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
                        default:
                            sendCode(res, 404);
                            break;
                    }
                    break;
                default:
                    serveFile(res, `./dist/${route.join('/')}`);
                    break;
            }
            
            /*
            switch (req.url) {
                case '/config.json':
                    if (req.method === 'GET') {
                        res.setHeader('Content-Type', 'application/json');
                        res.end(fs.readFileSync('./config.json', 'utf8'));
                    }
                    else if (req.method === 'PUT') {
                        let configJson = '';
                        req.setEncoding('utf8');
                        req.on('data', (data) => {
                            configJson += data;
                        });
                        req.on('end', () => {
                            utility.parseJson(configJson, (e, config) => {
                                if (e === null) {
                                    event.processor.updateConfig(config);
                                    fs.writeFileSync('./config.json', JSON.stringify(config, null, '\t'));
                                }
                                else {
                                    cli.error(e);
                                    res.statusCode = 500;
                                }
                                res.end();
                            });
                        });
                    }
                    else {
                        res.setHeader('Allow', 'GET, PUT');
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
            */
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
    
    function serveFile(res, filepath) {
        filepath = path.resolve(filepath);
        if (fs.existsSync(filepath)) {
            switch (path.extname(filepath)) {
                case '.json':
                    res.setHeader('Content-Type', 'application/json');
                    break;
                case '.js':
                    res.setHeader('Content-Type', 'application/javascript');
                    break;
            }
            fs.readFile(filepath, 'utf8', (e, content) => {
                if (e == null) {
                    res.setHeader('Content-length', content.length);
                    res.end(content);
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
    
    function checkError(res, e) {
        if (e != null) {
            cli.error(e);
            res.statusCode = 500;
        }
        res.end();
    }
};
