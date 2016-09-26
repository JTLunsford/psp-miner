"use strict"

const exec = require('child_process').exec;
const spawn = require('child_process').spawn;
const fs = require('fs');
const path = require('path');

const cli = require('cli');
const _ = require('lodash');
const _async = require('async');
const ps = require('ps-node');

const pidsToKillPath = path.resolve('./pids-to-kill.json');

const eventHandler = require('./event-handler');

let config;

exports.opts = {
	start: 				['s', 'start the capture'],
	fd:					['f', 'capture file descriptors'],
	proc:   			['p', 'capture the child/parent relationships'],
	"proc-in-prog":		['g', 'capture processes that are in progress at app start'],
	"no-sysdig":		['n', 'do not spawn sysdig process'],
	"test-child":		['c', 'add a test child/parent'],
	"test-events":		['e', 'add a test child/parent'],
	"test-internet":	['i', 'test internet connection'],
	url:				[false, 'remote server url to send events for processing', 'url'],
	"run-for":			[false, 'run application for a certain number of seconds', 'int'],
    "db-write-freq":    [false, 'frequency, in seconds, to write db.json', 'int', 30]
};

let event;
exports.load = (args, opts, cb) => {
	let firstRun = true;
	cli.debug(`arguments: ${args}`);
	cli.debug(`options: ${JSON.stringify(opts)}`);
	if(opts.start){
		if (opts["run-for"] !== null) {
			setTimeout(() => {
				process.exit(0);
			}, opts["run-for"] * 1000);
		}
		
		if (opts["test-internet"]) {
			cli.debug('running test-internet');
			setInterval(() => {
				exec('./test-internet',(err) => {
					if (err) {
						cli.error(`TEST INTERNET - ${err}`);
					}
					else {
						cli.debug('test-internet done');
					}
				});
			}, 2500);
		}

		if(opts["test-child"]) {
			setTimeout(() => {
				exec('(sleep 5; echo "test";)');
			},10000);
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
		
		event = eventHandler(opts['db-write-freq'], opts.url, (serverEvent) => {
			switch (serverEvent.event) {
				case 'config-update':
					config = serverEvent.data;
					cli.debug(`miner config updated - ${JSON.stringify(config)}`);
					killSysdigs((e) => {
						if (e != null) {
							cli.error(`KILLING SYSDIGS - ${e}`);
						}
					});
					if (firstRun) {
						firstRun = false;
						if (opts['proc-in-prog']) {
							reportAlreadyRunningProcs((e, events) => {
								if (e == null) {
									_.each(events, event);
								}
								else {
									cli.error(`PS (IN PROGRESS PROCS) - ${e}`);
								}
							});
						}
						if (!opts["no-sysdig"]) {
							keepSysdigRunning();
						}
					}
					break;
				default:
					cli.info(`unknown server event ${serverEvent.event} received`);
					break;
			}
		});
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
				// cli.debug('sending event');
				// cli.debug(JSON.stringify(parsedData,null,'\t'));
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
				ptProcName: parsed[6]
			}
		}
	}
	
	function loadPidsToKill(cb) {
		cli.debug('loading pids to kill');
		if (!fs.existsSync(pidsToKillPath)) {
			fs.writeFileSync(pidsToKillPath, '[]', 'utf8');
			cb(null, []);
		}
		else {
			fs.readFile(pidsToKillPath, 'utf8', (e, pidsToKillJson) => {
				if (e == null) {
					cb(null, JSON.parse(pidsToKillJson));
				}
				else {
					cb(`ERROR LOADING pids-to-kill.json:\n${e.stack}`);
				}
			});
		}
	}
	
	function killPids(pids, cb) {
		cli.debug(`killing ${pids.length} pid(s)`);
		_async.each(pids, (pid, cb) => {
			ps.kill(pid, (e) => {
				if (e != null) {
					if (e.message != void 0 && e.message.indexOf('No such process') == -1) {
						cli.error(`PS (KILLING PIDS) - ${e}`);
					}
					else {
						cli.debug(`${pid} not found`);
					}
				}
				else {
					cli.debug(`killed pid: ${pid}`);
				}
				cb(null);
			});
		}, (e) => {
			if (e == null) {
				cb(null);
			}
			else {
				cb(`ERROR KILLING PROCESSES:\n${e.stack}`);
			}
		});
	}
	
	function killSysdigs(cb) {
		_async.waterfall([
			loadPidsToKill,
			killPids
		], cb);
	}
	
	function keepSysdigRunning() {
		 cli.debug('persisting sysdig');
		function started(e, pid) {
			savePidToKill(pid);
		}
		function closed(code) {
			killPids((e) => {
				startSysdig(started, closed);
			});
		}
		startSysdig(started, closed);
	}
	
	function startSysdig(started, closed) {
		cli.info('starting sysdig');
		const args = buildSysdigArgs();
		cli.debug(`spawning: sysdig ${args.join(' ')}`);
		let sysdig = spawn('sysdig', args);
		sysdig.stdout.setEncoding('utf8');
		sysdig.stdout.on('data', (data) => {
			for(let line of data.split('\n')){
				consume(line);
			}
		});
		sysdig.stderr.setEncoding('utf8');
		sysdig.stderr.on('data', (err) => {
			if (err.indexOf('warning') > -1) {
				cli.error(`SYSDIG WARNING - ${err}`);
			}
			else {
				cli.fatal(`SYSDIG - ${err}`);
			}
		});
		sysdig.on('exit', (code) => {
			closed(code);
		});
		process.nextTick(() => { started(null, sysdig.pid); });
	}
	
	function buildSysdigArgs() {
		let args = [];
		if (config.filter.not) {
			args.push('not');
		}
		_.each(config.filter.and, (filter, i) => {
			if (i === 0 && config.filter.or.length > 0) {
				filter = `(${filter}`;
			}
			args = args.concat(filter.split(' '));
			if (i < config.filter.and.length - 1) {
				args.push('and');	
			}
			else if (config.filter.or.length > 0) {
				args[args.length - 1] = `${args[args.length - 1]})`;
			}
		});
		if (config.filter.and.length > 0 && config.filter.or.length > 0) {
			args.push('or');
		}
		_.each(config.filter.or, (filter, i) => {
			args = args.concat(filter.split(' '));
			if (i < config.filter.or.length - 1) {
				args.push('or');	
			}
		});
		if (args[0] === 'not') {
			args[1] = `(${args[1]}`;
			args[args.length - 1] = `${args[args.length - 1]})`;
		}
		if (args.length > 0) {
			args[0] = `"${args[0]}`;
			args[args.length - 1] = `${args[args.length - 1]}"`;
		}
		args = args.join(' ');
		return [ args ];
	}
	
	function savePidToKill(pid) {
		let pidsToKill = [];
		if (fs.existsSync(pidsToKillPath)) {
			pidsToKill = JSON.parse(fs.readFileSync(pidsToKillPath, 'utf8'));
		}
		pidsToKill.push(pid);
		fs.writeFileSync(pidsToKillPath, JSON.stringify(pidsToKill), 'utf8');
	}
	
	function reportAlreadyRunningProcs(cb) {
		let events;
		exec('ps -el', (e, stdout, stderr) => {
			if (e == null) {
				if (stderr.length == 0) {
					const re = /\d \w *\d+ *(\d+) *(\d+).*:\d{2} (\S*)/g;
					let match = re.exec(stdout);
					events = [];
					while (match != null) {
						const r = {
							procname: match[3],
							pid: parseInt(match[1]),
							open: false,
							eventType: 'running'
						};
						if (parseInt(match[2]) > 0) {
							r.relation = parseInt(match[2]);
						}
						events.push(r);
						match = re.exec(stdout);
					}
					events = _.reduce(events, (unskipped, psResult) => {
						if (!skip(psResult) && psResult.procname != 'ps') {
							unskipped.push(psResult);
						}
						return unskipped;
					}, []);
					_.each(events, (current) => {
						if (current.relation > 0) {
							const parent = _.find(events, (possibleParent) => {
								return possibleParent.pid == current.relation;
							});
							if (parent != void 0) {
								current.relation = {
									pid: current.pid,
									pProcName: current.procname,
									ptid: parent.pid,
									ptProcName: parent.procname
								};
							}
						}
					});
					cb(null, events);
				}
				else {
					cb(stderr);
				}
			}
			else {
				cb(e);
			}
		});
	}
};
