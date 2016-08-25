"use strict";

module.exports = (url) => {
	return (evt) => {
		if (url === void 0) {
		    const processor = require('./processor');
		    processor(evt);
		}
		else {
            const ws = require('ws');
            new ws.WebSocket(url).on('open', (a, b, c) => {
                console.log('client socket open', a, b, c);
            });
		}
	};
};
