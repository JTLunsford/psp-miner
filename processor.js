"use strict";
const cli = require('cli');
const fs = require('fs');
const path = require('path');
const dbFilePath = path.join(__dirname,'db.json');
const config = require('./config.json');
const _ = require('lodash');

let skipProcNames = _.map(config.skip, 'proc');
cli.debug('skip proc names: '+JSON.stringify(skipProcNames));

let dbLoaded = false;

let db;

fs.stat(dbFilePath,(err) => {
	if(err) {
		cli.info('db not found: writing an empty one');
		db = {
			"connections":{},
			"resources":{},
			"processes":{}
		};

		dbLoaded = true;

		fs.writeFile(dbFilePath, JSON.stringify(db), (err) => {
			cli.debug('empty db written');
		});
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
	},60000);
});

function create(evt) {
	db.processes[evt.procname] = {
		procname: evt.procname,
		events: 1
	};
}

function update(evt) {
	db.processes[evt.procname].events++;
}

function upsertProcess(procname, parent) {
	cli.debug('upserting');
	if(!_.some(skipProcNames,(n)=>{return n===procname;})) {
		cli.debug('proc name not skipped');

		if(db.processes[procname] === void 0) {
			db.processes[procname] = {
				procname: procname,
				children: [],
				connections: [],
				events: 1
			};					
		}
		else {
			db.processes[procname].events++;
		}
		if(parent) {
			upsertProcess(parent);
			db.processes[parent].children.push(procname);
		}
	}
}

function upsertConnection(procname, ip) {

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

module.exports = (evt) => {
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
				if(evt.eventType==='sendto') {
				
					switch(evt.data.fdType) {
						case '4u':
						case '4t':
							upsertConnection(evt.procname,evt.data.targetIp);
							break;
						default:
							break;
					}
				}
				if(evt.eventType==='recvfrom') {
				
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
};

