"use strict";
const cli = require('cli');
const fs = require('fs');
const path = require('path');
const dbFilePath = path.join(__dirname,'db.json');
const _ = require('lodash');
const cidr = require('cidr-js');
const minimatch = require('minimatch');

let config;
let dbLoaded = false;

let db;
function upsertProcess(procname, parent) {
	cli.debug('upserting');
	if(!_.some(_.map(config.skip, 'proc'),(n)=>{return n===procname || procname.match(n) !== null;})) {
		cli.debug(`proc ${procname} not skipped`);
		if(db.processes[procname] === void 0) {
			db.processes[procname] = {
				procname: procname,
				children: [],
				connections: [],
				resources: [],
				events: 1
			};					
		}
		else {
			db.processes[procname].events++;
		}
		if(parent !== void 0) {
			upsertProcess(parent);
			if(db.processes[parent]){
				db.processes[parent].children.push(procname);
				db.processes[parent].children = _.uniq(db.processes[parent].children);
			}
		}
	}
}

function upsertConnection(procname, ip) {
	if(!_.some(config.ipSkip,(n)=>{return ip == n || _.some(new cidr().list(n), (anIp) => { return anIp == ip; });})) {
		cli.debug(`connection ${ip} not skipped`);
		if(db.connections[ip] === void 0) {
			db.connections[ip] = {
				ip: ip,
				procs: [procname],
				events: 1
			};					
		}
		else {
			db.connections[ip].events++;
			db.connections[ip].procs.push(procname);
			db.connections[ip].procs = _.uniq(db.connections[ip].procs);
		}
		db.processes[procname].connections.push(ip);
		db.processes[procname].connections = _.uniq(db.processes[procname].connections);
	}
}

function upsertResource(procname, path) {
	if(!_.some(config.pathSkip,(n)=>{return minimatch(n, path);})) {
		cli.debug(`resource ${path} not skipped`);
		if(db.resources[path] === void 0) {
			db.resources[path] = {
				path: path,
				procs: [procname],
				events: 1
			};					
		}
		else {
			db.resources[path].events++;
			db.resources[path].procs.push(procname);
			db.resources[path].procs = _.uniq(db.resources[path].procs);
		}
		if(db.processes[procname]){
			db.processes[procname].resources.push(path);
			db.processes[procname].resources = _.uniq(db.processes[procname].resources);
		}
	}
}

function initializeDb(cb) {
	db = {
		"connections":{},
		"resources":{},
		"processes":{}
	};

	dbLoaded = true;

	fs.writeFile(dbFilePath, JSON.stringify(db), (err) => {
		cli.debug('empty db written');
		if (err) {
			cli.error(err);
			if (_.isFunction(cb)) {
				cb(err);
			}
		}
		else if (_.isFunction(cb)) {
			cb(null);
		}
	});
}

function archiveDb(name, cb) {
    const archivePath = path.resolve('./archive');
    if (!fs.existsSync(archivePath)) {
        fs.mkdirSync(archivePath);
    }
    let filepath = path.join(archivePath, `${name}`);
    let c = 1;
    let suffix = '';
    while (fs.existsSync(`${filepath}${suffix}.json`)) {
    	suffix = `-${++c}`;
    }
    filepath = `${filepath}${suffix}.json`;
	fs.writeFile(filepath, JSON.stringify(db), (err) => {
		cli.debug(`db archived to ${filepath}`);
		if (err) {
			cli.error(err);
			if (_.isFunction(cb)) {
				cb(err);
			}
		}
		else {
			initializeDb(cb);
		}
	});
}

function initializeProcessor(dbWriteFreqInSeconds) {
	fs.stat(dbFilePath,(err) => {
		if(err) {
			cli.info('db not found: writing an empty one');
			initializeDb();
		}
		else {
			cli.debug('db found');
			db = require(dbFilePath);
			cli.debug(`db size: ${JSON.stringify(db).length}`);
			dbLoaded = true;
		}
	
		setInterval(() => {
			fs.writeFile(dbFilePath, JSON.stringify(db), (err) => {
				if(err) {
					cli.error(err);
				}
				else {
					cli.debug('db written to disk');
				}
			});
		}, dbWriteFreqInSeconds * 1000);
	});
}

function handle(evt) {
	process.nextTick(() => {
		cli.debug(`processor received event: ${JSON.stringify(evt,null,'\t')}`); 
		if(dbLoaded) {
			if(evt.relation) {
				upsertProcess(evt.procname,evt.relation.ptProcName);		
			}
			else {
				upsertProcess(evt.procname);
			}

			if(evt.data) {
				if (evt.data.fdType === 'f') {
					upsertResource(evt.procname, evt.data.path);
				}
				else if(evt.eventType==='sendto') {
				
					switch(evt.data.fdType) {
						case '4u':
						case '4t':
							upsertConnection(evt.procname,evt.data.targetIp);
							break;
						default:
							break;
					}
				}
				else if(evt.eventType==='recvfrom') {
				
					switch(evt.data.fdType) {
						case '4u':
						case '4t':
							upsertConnection(evt.procname,evt.data.sourceIp);
							break;
						default:
							break;
					}
				}
			}
		}
	});
}
handle.initializeDb = initializeDb;
handle.archiveDb = archiveDb;
handle.initializeProcessor = initializeProcessor;
handle.updateConfig = (cfg) => {
	cli.debug('processor config updated');
	config = cfg;
};

module.exports = handle;

