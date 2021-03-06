"use strict";

const http = require('http');
const path = require('path');
const fs = require('fs');

const _ = require('lodash');

const cli = require('cli');
const ws = require('ws');
const uuid = require('uuid');

const utility = require('./utility');

exports.opts = {
    "db-write-freq":    [false, 'frequency, in seconds, to write db.json', 'int', 30],
	"event-logging":	['l', 'output events data json to stdout']
};

let clients = [];

exports.load = (args, opts, cb) => {
    setInterval(() => {
        outputClientsConnected();
    }, 30000);
    let config, configJson;
    const archiveFolderPath = path.resolve('./archive');
    setConfig(require('./config.json'));
    const event = require('./event-handler')(opts);
    new ws.Server({
        server: http.createServer((req, res) => {
            let route = req.url.split('/').slice(1);
            if (route.length == 1 && route[0].length == 0) {
                cli.debug('serving home page');
                route = [ 'index.html' ];
            }
            const indexOfQuery = route[route.length - 1].indexOf('?');
            if (indexOfQuery > -1) {
                route[route.length - 1] = route[route.length - 1].substring(0, indexOfQuery);
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
                                            cli.debug('clearing db.json');
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
                                                    parseJsonBody(req, res, (fields) => {
                                                        if (fields.name !== void 0) {
                                                            cli.debug(`creating archive: ${fields.name}`);
                                                            event.processor.archiveDb(fields.name, (e) => {
                                                                if (e != null) {
                                                                    cli.error(e);
                                                                    sendCode(res, 500);
                                                                }
                                                                else {
                                                                    res.end();
                                                                }
                                                            });
                                                        }
                                                        else {
                                                            sendCode(res, 400);
                                                        }
                                                    });
                                                    break;
                                                case 'GET':
                                                    if (fs.existsSync(archiveFolderPath)) {
                                                        fs.readdir(archiveFolderPath, (e, filenames) => {
                                                            if (e == null) {
                                                                res.setHeader('Content-type', 'application/json');
                                                                const archives = [];
                                                                for (const filename of filenames) {
                                                                    const filestat = fs.statSync(path.resolve(path.join(archiveFolderPath, filename)));
                                                                    const name = filename.substring(0, filename.indexOf(path.extname(filename)));
                                                                    archives.push({
                                                                        name: name,
                                                                        created: filestat.ctime,
                                                                        size: filestat.size,
                                                                        url: `/api/data/archive/${name}` 
                                                                    });
                                                                }
                                                                res.end(JSON.stringify(archives, null, '\t'));
                                                            }
                                                            else {
                                                                cli.error(e);
                                                                sendCode(res, 500);
                                                            }
                                                        });
                                                    }
                                                    else {
                                                        res.end('[]');
                                                    }
                                                    break;
                                                default:
                                                    send405(res, 'GET, POST');
                                                    break;
                                            }
                                            break;
                                        default:
                                            const archivePath = path.join(archiveFolderPath, `${route[3]}.json`);
                                            switch (req.method) {
                                                case 'GET':
                                                    serveFile(res, archivePath);
                                                    break;
                                                case 'DELETE':
                                                    if (fs.existsSync(archivePath)) {
                                                        cli.debug(`deleting archive: ${route[3]}`);
                                                        fs.unlink(archivePath, (e) => {
                                                            if (e == null) {
                                                                res.end();
                                                            }
                                                            else {
                                                                sendCode(res, 500);
                                                            }
                                                        });
                                                    }
                                                    else {
                                                        sendCode(res, 404);
                                                    }
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
                                    res.setHeader('Content-Type', 'application/json');
                                    res.end(configJson);
                                    break;
                                case 'PUT':
                                    parseJsonBody(req, res, (config) => {
                                        cli.debug(`updating config - ${JSON.stringify(config)}`);
                                        updateConfig(config);
                                        fs.writeFileSync('./config.json', configJson);
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
        socket.__id = uuid.v4();
        clients.push(socket);
        outputClientsConnected();
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
        socket.on('close', () => {
            removeClient(socket.__id);
        });
        socket.on('error', (e) => {
            cli.error(`SOCKET CLIENT ERROR:\n${e.stack}`);
            if (socket.readyState < 3) {
                socket.close();
                removeClient(socket.__id);
            }
        });
        socket.send(JSON.stringify({
            event: 'config-update',
            data: config
        }));
    }).on('error', (e) => {
        cli.error(`SOCKET SERVER ERROR:\n${e.stack}`);
    });
    
    function parseJsonBody(req, res, cb) {
        if (req.headers['content-type'] == 'application/json') {
            parseBody(req, (json) => {
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
    
    function parseFormBody(req, res, cb) {
        const boundryIdMatch = req.headers['content-type'].match(/multipart\/form-data; boundary=[-]+(WebKitFormBoundary.+)/);
        if (boundryIdMatch != null) {
            const boundryId = boundryIdMatch[1];
            cli.debug(`parsing form body: ${boundryId}`);
            parseBody(req, (body) => {
                const kvps = {};
                const re = new RegExp(`${boundryId}\\s*Content-Disposition: form-data; name="(.+)"\\s*(\\S+)`, 'g');
                let m = re.exec(body);
                while (m != null) {
                    kvps[m[1]] = m[2];
                    m = re.exec(body);
                }
                cb(kvps);
            });
        }
        else {
            sendCode(res, 415);
        }
    }
    
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
            cli.debug(`serving ${filepath}`);
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
            readFile(filepath, (e, buf) => {
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
    
    function readFile(filepath, cb) {
        fs.readFile(filepath, (e, buf) => {
            if (e == null) {
                cb(null, buf);
            }
            else {
                cb(e);
            }
        });
    }
    
    function updateConfig(newConfig) {
        setConfig(newConfig);
        event.processor.updateConfig(config);
        _.each(clients, (c) => {
            if (c.readyState == 1) {
                c.send(JSON.stringify({
                    event: 'config-update',
                    data: config
                }));
            }
        });
    }
    
    function setConfig(newConfig) {
        config = newConfig;
        configJson = JSON.stringify(newConfig, null, '\t');
    }
    
    function removeClient(id) {
        clients = _.filter(clients, (c) => {
            return c.__id != id;
        });
        outputClientsConnected(true);
    }
    
    function outputClientsConnected(reportZero) {
        if (clients.length > 0 || reportZero) {
            cli.info(`${clients.length} client(s) connected`);
        }
    }
};
