const fs = require('fs');
const path = require('path');
const child_process = require('child_process');

const { getVideoDurationInSeconds } = require('get-video-duration');
const { v4: uuidv4 } = require('uuid');
const { getIO } = require('../utils/utils');

const recordingsDirectory = path.join(process.cwd(), 'Recordings')
const imagesDirectory = path.join(process.cwd(), 'previewImages');

class TwitchDownload {
    constructor(channel, issuerUUID) {
        this.id = uuidv4();
        this.channel = channel;
        this.issuerUUID = issuerUUID;
        this.recordingFilePath = path.join(recordingsDirectory, this.channel + '.ts');
        this.recordingProcess;
        this.state = 0;
        this.lastemitspeed = null;
        const statsInterval = 5000;
        const imageInterval = 25000;

        const statstimer = async () => {
            if (this.state !== 0 && fs.existsSync(this.recordingFilePath)) return;
            await this.toAll((s) => this.emitStats(s));
            setTimeout(statstimer, statsInterval);
        }
        setTimeout(statstimer, statsInterval);

        const imagetimer = async () => {
            if (this.state !== 0 && fs.existsSync(this.recordingFilePath)) return;
            await this.toAll((s) => this.changeImage(s));
            setTimeout(imagetimer, imageInterval);
        }
        setTimeout(imagetimer, imageInterval);
    }

    async toAll(cb) {
        const sockets = await getIO().fetchSockets();
        await Promise.all(sockets.map(async socket => {
            await cb(socket);
        }));
    }

    checkIssuer(socket) {
        return (socket.auth.user.UUID == this.issuerUUID) || socket.auth.user.UUID == process.env.OWNER_UUID;
    }

    async initialInfos(socket) {
        if (!this.checkIssuer(socket)) return;

        console.log('Got Initial Infos');
        socket.emit('infos', { id: this.id, name: this.channel, state: this.state })
        if (fs.existsSync(this.recordingFilePath))
            await Promise.all([
                this.emitStats(socket),
                this.changeImage(socket)
            ]);
    }

    loadFromID() {

    }

    async emitStats(socket) {
        console.log('emitStats()', this.channel);
        if (!this.checkIssuer(socket)) return;
        const { length, size, speed } = await this.collectStats();


        console.log({ length, size, speed });

        // console.log(socket.auth);
        socket.emit('stats', { id: this.id, length, size, speed });

    }

    async changeImage(socket) {
        console.log('changeImage()', this.channel);
        if (!this.checkIssuer(socket)) return;
        await this.makeImage();
        socket.emit('imageChange', { id: this.id });
        console.log('END changeImage()', this.channel);
    }

    getReadableSizeString(fileSizeInBytes) {
        var i = -1;
        var byteUnits = [' kB', ' MB', ' GB', ' TB', 'PB', 'EB', 'ZB', 'YB'];
        do {
            fileSizeInBytes = fileSizeInBytes / 1024;
            i++;
        } while (fileSizeInBytes > 1024);

        return Math.max(fileSizeInBytes, 0.1).toFixed(1) + byteUnits[i];
    };


    async collectStats() {
        return new Promise((resolve, reject) => {
            try {
                const prevStats = fs.statSync(this.recordingFilePath);
                setTimeout(async () => {
                    const stats = fs.statSync(this.recordingFilePath);
                    const length = await getVideoDurationInSeconds(this.recordingFilePath);
                    resolve({
                        length,
                        size: stats.size,
                        speed: (stats.size - prevStats.size) / 5,
                    })
                }, 5000);
            } catch (error) {
                reject(error);
            }
        });
    }

    async makeImage() {
        const imageLocation = path.join(imagesDirectory, this.channel + '.jpg');

        fs.existsSync(imageLocation) && fs.rmSync(imageLocation);


        const genCommand = (offset) => {
            let command = `ffmpeg -sseof -${offset} -i `
            command += `"${this.recordingFilePath}" `;
            command += '-update 1 -q:v 1 ';
            command += `"${imageLocation}"`;

            return command;
        }

        try {
            let output = await this.deepExecPromisify(genCommand(3), process.cwd());
            if (fs.existsSync(imageLocation))
                return;

            output = await this.deepExecPromisify(genCommand(10), process.cwd());
            if (fs.existsSync(imageLocation))
                return;
        } catch (error) {
            console.error(error);
        }
    }

    startRecording() {
        const command = `streamlink --output "${this.recordingFilePath}" twitch.tv/${this.channel} best`;
        this.recordingProcess = this.executeProcess(command, process.cwd(), (out) => {
            console.log('RECORDING', out);
            if (out.includes('Stream ended') || out.includes('Closing currently open stream...')) {
                console.log('GOT STREAM STOP');
                this.stopRecordingStreamStop();
            }
        }, (err) => {
            console.error('RECORDING ERR', err)
        }, () => {
            this.stopRecordingStreamStop();
        });
    }

    async stopRecordingStreamStop() {
        this.stopRecording();
        await this.toAll((c) => this.initialInfos(c))
    }

    async stopRecording(socket) {
        if (socket && !this.checkIssuer(socket)) return;
        this.state = 1;
        if (this.recordingProcess) {
            console.log('Tried to stop Recording:', this.recordingProcess.pid);
            this.recordingProcess.kill('SIGTERM');
            return await new Promise((resolve, reject) => { setTimeout(resolve, 500); })
        }
    }

    startRendering(socket) {
        if (socket && !this.checkIssuer(socket)) return;
        this.state = 2;
        const command = `ffmpeg -i ${this.chanel}.ts -c copy ${this.chanel}.mp4`
        this.recordingProcess = this.executeProcess(command, process.cwd(), console.log, console.error, () => { });
    }

    executeProcess(command, cwd, out, err, stop) {
        const process = child_process.spawn('bash', ['-i'], { encoding: 'utf8', cwd });

        process.stderr.on('data', (data) => err(data.toString()));

        process.stdout.on('data', (data) => {
            data = data.toString().split(/(\r?\n)/g);
            data.forEach((_, index) => {
                var line = data[index].trim();
                if (line !== '\n' && line !== '') {
                    out(line);
                }
            });
        });
        process.on('close', stop);
        process.on('exit', stop);

        process.stdout.on('close', stop);
        process.stderr.on('close', stop);

        process.stdout.on('error', stop);
        process.stderr.on('close', stop);

        process.stdin.write(`${command}\n`);

        return process;
    }

    async deepExecPromisify(command, cwd) {
        return await new Promise((resolve, reject) => {
            child_process.exec(command, { encoding: 'utf8', cwd }, (error, stdout, stderr) => {
                // console.log({ error, stdout, stderr });
                if (error) {
                    reject({ error, stdout: stdout?.trim()?.split('\n'), stderr: stderr?.trim()?.split('\n') });
                }
                resolve([...stdout?.split('\n'), ...stderr?.split('\n')]);
            });
        })
    }


}

module.exports = TwitchDownload;