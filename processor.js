"use strict";

module.exports = (evt) => {
    process.nextTick(() => {
        console.log('processor received event: ', evt); 
    });
};
