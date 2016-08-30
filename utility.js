
exports.parseJson = (str, cb) => {
    let obj;
    try {
        obj = JSON.parse(str);
        process.nextTick(() => { cb(null, obj); });
    }
    catch (e) {
        cb(e);
    }
};