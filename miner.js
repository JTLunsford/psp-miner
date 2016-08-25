"use strict"

const path = require('path');
const spawn = require('child_process').spawn;
const exec = require('child_process').exec;

const cli = require('cli');
const _ = require('lodash');
const _async = require('async');
const jsome = require('jsome');
const eventHandler = require('./event-handler');
const config = require('./config.json');

exports.opts = {
	start: 				['s', 'start the capture'],
	fd:					['f', 'capture file descriptors'],
	proc:   			['p', 'capture the child/parent relationships'],
	url:				[false, 'remote server url to send events for processing', 'url'],
	"no-sysdig":		['n', 'do not spawn sysdig process'],
	"test-child":		['c', 'add a test child/parent'],
	"test-events":		['e', 'add a test child/parent']
};


let event;
exports.load = (args, opts, cb) => {
	if(opts.start){
		event = eventHandler(opts.url);

		if(opts["test-child"]) {
			setTimeout(() => {
				exec('(sleep 5; echo "test";)');
			},10000);
		}

		if (!opts["no-sysdig"]) {
			let sysdig = spawn('sysdig',['evt.type!=switch', 'and', 'proc.name!=V8', 'and', 'proc.name!=node', 'and', 'proc.name!=sshd', 'and', 'proc.name!=sysdig']);
			sysdig.stdout.setEncoding('utf8');
			sysdig.stdout.on('data', (data) => {
				for(let line of data.split('\n')){
					consume(line);
				}
			});
		}

		if (opts["test-events"]) {
			setInterval(() => {
				cli.debug('sending event');
				event({
					eventId: 1086,
					time: "14:03:01.803821802",
					cpu: 1,
					procname: "crond",
					pid: 1568,
					open: false,
					eventType: "open",
					data: {
						fdId: 6,
						fdType: "f",
						path: "/etc/passwd"
					}
				});
			}, 2500);
		}
	}
	else{
		cli.error('start is missing');
		cli.getUsage();
	}

	function skip(parsedData) {
		let skipProc, skipEvent, skipOpen;
		skipProc = skipEvent = skipOpen = false;

		for(let skipConfig of config.skip){
			if(skipConfig.proc && skipConfig.proc === parsedData.procname)
				skipProc = true;
			if(skipConfig.event && skipConfig.event === parsedData.eventType)
				skipEvent = true;
			if(skipConfig.open && skipConfig.open === parsedData.open)
				skipOpen = true;
		}

		return skipProc || skipEvent || skipOpen;
	}

	function consume(data) {
		let parser = /(\d+)\s(\S+)\s(\d+)\s(\S+)\s\((\d+)\)\s([<|>])\s(\S+)\s(.+)/;
		let parsedData = model(parser.exec(data));
		if(parsedData && !skip(parsedData)){
			parsedData.processed = false;
			if(opts.fd) {
				let fdParser = /fd=(\d+)\(<([^>]+)>(?:([^) ]*):(.*)->([^) ]*):(.*)|(\/(?:[^)]+)))?\)/;
				let parsedRawData = fdModel(fdParser.exec(parsedData.eventRawData));
				if(parsedRawData) {
					parsedData.data = parsedRawData;
					parsedData.processed = true;
				}
			}
			if(opts.proc && (parsedData.eventType==='execve' || parsedData.eventType==='clone')) {
				let procParser = /tid=(\d*)\(([^)]*)\) pid=(\d*)\(([^)]*)\) ptid=(\d*)\(([^)]*)\)/;
				let parsedRawData = procModel(procParser.exec(parsedData.eventRawData));
				if (parsedRawData) {
					parsedData.relation = parsedRawData;
					parsedData.processed = true;
				}
			}
			if(parsedData.processed) {
				delete parsedData.eventRawData;
				jsome(parsedData);
				event(parsedData);
			}
		}
	}

	function model(parsed) {
		return parsed ? {
			eventId:parseInt(parsed[1]),
			time:parsed[2],
			cpu:parseInt(parsed[3]),
			procname:parsed[4],
			pid:parseInt(parsed[5]),
			open:parsed[6]==='>'?true:false,
			eventType:parsed[7],
			eventRawData:parsed[8]
		}:void 0;
	}

	function fdModel(parsed) {
		if(parsed && (parsed[3] || parsed[7])) {
			if(parsed[3] !== void 0) {
				return {
					fdId:parseInt(parsed[1]),
					fdType:parsed[2],
					sourceIp:parsed[3],
					sourceP:parsed[4],
					targetIp:parsed[5],
					targetP:parsed[6]
				}
			}
			else if(parsed[7] !== void 0) {
				return {
					fdId:parseInt(parsed[1]),
					fdType:parsed[2],
					path:parsed[7]
				}
			}
		}
		else {
			return void 0;
		}
	}

	function procModel(parsed) {
		if (parsed) {
			return {
				tid: parsed[1],
				tprocName: parsed[2],
				pid: parsed[3],
				pProcName: parsed[4],
				ptid: parsed[5],
				ptProceName: parsed[6]
			}
		}
	}
};
