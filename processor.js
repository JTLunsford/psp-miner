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
	let item;
	if(!_.some(_.map(config.skip, 'proc'),(n)=>{return n===procname || procname.match(n) !== null;})) {
		cli.debug(`proc ${procname} not skipped`);
		item = _.find(db,(i) => { return i.name === procname;});
		if(!item) {
			db.push({
				name: procname,
				type: 'p',
				children: [],
				events: 1
			});					
		}
		else {
			item.events++;
		}
		if(parent !== void 0) {
			let p = upsertProcess(parent);
			if(p){
				p.children.push(procname);
				p.children = _.uniq(p.children);
			}
		}
	}
	return item;
}

function upsertConnection(procname, ip) {
	if(!_.some(config.ipSkip,(n)=>{return ip == n || _.some(new cidr().list(n), (anIp) => { return anIp == ip; });})) {
		cli.debug(`connection ${ip} not skipped`);
		let item = _.find(db,(i) => { return i.name === ip;});
		
		console.log(procname, item);
		
		if(!item) {
			db.push({
				name: ip,
				type: 'c',
				parents: [procname],
				events: 1
			});					
		}
		else {
			item.events++;
			item.parents.push(procname);
			item.parents = _.uniq(item.parents);
		}
		let proc = _.find(db,(i) => { return i.name === procname;});
		proc.children.push(ip);
		proc.children = _.uniq(proc.children);
	}
}

function upsertResource(procname, path) {
	if(!_.some(config.pathSkip,(n)=>{return minimatch(n, path);})) {
		cli.debug(`resource ${path} not skipped`);
		let item = _.find(db,(i) => { return i.name === path;});
		if(!item) {
			db.push( {
				name: path,
				type: 'r',
				parents: [procname],
				events: 1
			});					
		}
		else {
			item.events++;
			item.parents.push(procname);
			item.parents = _.uniq(item.parents);
		}
		
		let proc = _.find(db,(i) => { return i.name === procname;});
		if(proc){
			proc.children.push(path);
			proc.children = _.uniq(proc.children);
		}
	}
}

function initializeDb(cb) {
	db = [];

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

function handle(evt, opts) {
	process.nextTick(() => {
		if (opts['event-logging']) {
			cli.debug(`processor received event: ${JSON.stringify(evt,null,'\t')}`);
		}
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

