"use strict"

const path = require('path');
const spawn = require('child_process').spawn;

const cli = require('cli');
const _ = require('lodash');
const _async = require('async');
const jsome = require('jsome');

exports.opts = {
	start: 	['s','start the capture'],
	fd:	['f','capture file descriptors']
};

exports.load = (args, opts, cb) => {
	if(opts.start){
		let sysdig = spawn('sysdig',['evt.type!=switch', 'and', 'proc.name!=V8', 'and', 'proc.name!=node', 'and', 'proc.name!=sshd', 'and', 'proc.name!=sysdig']);
		sysdig.stdout.setEncoding('utf8');
		sysdig.stdout.on('data', (data) => {
			for(let line of data.split('\n')){
				consume(line);
			}
		});
	}
	else{
		cli.error('start is missing');
		cli.getUsage();
	}


	function consume(data) {
		let parser = /(\d+)\s(\S+)\s(\d+)\s(\S+)\s\((\d+)\)\s([<|>])\s(\S+)\s(.+)/;
		let parsedData = model(parser.exec(data));
		if(parsedData){
			if(opts.fd) {
				
				let fdParser = /fd=(\d+)\(<([^>]+)>(?:([^) ]*):(.*)->([^) ]*):(.*)|(\/(?:[^)]+)))?\)/;
				let parsedRawData = fdModel(fdParser.exec(parsedData.eventRawData));
				if(parsedRawData) {
					delete parsedData.eventRawData;
					parsedData.data = parsedRawData;
					jsome(parsedData);
				}
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
					leftIp:parsed[3],
					leftP:parsed[4],
					rightIp:parsed[5],
					rightP:parsed[6]
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
};
