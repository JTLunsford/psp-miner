"use strict"

const path = require('path');
const spawn = require('child_process').spawn;

const cli = require('cli');
const _ = require('lodash');
const _async = require('async');

exports.opts = {
	someopt: ['s','test for some option','string','default value']
};

exports.load = (fileGlobs, opts, cb) => {
	let sysdig = spawn('sysdig',['evt.type!=switch', 'and', 'proc.name!=V8', 'and', 'proc.name!=node', 'and', 'proc.name!=sshd', 'and', 'proc.name!=sysdig']);
	sysdig.stdout.setEncoding('utf8');
	sysdig.stdout.on('data', (data) => {
		for(let line of data.split('\n')){
			consume(line);
		}
	});
};

function consume(data) {
	let parser = /(\d+)\s(\S+)\s(\d+)\s(\S+)\s\((\d+)\)\s([<|>])\s(\S+)\s(.+)/;
	let parsedData = model(parser.exec(data));
	if(parsedData){
		
		let fdParser = /fd=(\d+)\(<([^>]+)>(?:([^) ]*):(.*)->([^) ]*):(.*)|(\/(?:[^)]+)))?\)/;
		console.log(fdParser.exec(parsedData.eventRawData));
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
