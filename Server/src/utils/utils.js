let io = null;
let downloaders = [];

const setIO = (_io) => io = _io;
const getIO = () => io;

const getDownloaders = () => downloaders;


module.exports = {
    setIO,
    getIO,
    getDownloaders
}