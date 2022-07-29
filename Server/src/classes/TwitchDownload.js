const fs = require('fs');
const path = require('path');
const child_process = require('child_process');

const { getVideoDurationInSeconds } = require('get-video-duration');
const { getIO } = require('../utils/utils');

const recordingsDirectory = path.join(process.cwd(), 'Recordings')
const imagesDirectory = path.join(process.cwd(), 'previewImages');

class TwitchDownload {
    constructor(channel) {
        this.channel = channel;
        this.recordingProcess;

        const statstimer = async () => {
            const sockets = await getIO().fetchSockets();
            await Promise.all(sockets.map(async socket => {
                await this.emitStats(socket);
            }));
            setTimeout(statstimer, 5000);
        }

        setTimeout(statstimer, 5000);

        setInterval(async () => {
            (await getIO().fetchSockets()).forEach(async socket => {
                await this.changeImage(socket);
            });
        }, 30000);
    }

    async initialInfos(socket) {
        console.log('Got Initial Infos');
        socket.emit('name', this.channel)
        await Promise.all([
            this.emitStats(socket),
            this.changeImage(socket)
        ])
    }

    loadFromID() {

    }

    async emitStats(socket) {
        console.log('emitStats()');
        const { length, size, speed } = await this.collectStats();


        console.log({ length, size, speed });

        // console.log(socket.auth);
        socket.emit('stats', { length, size, speed });

    }

    async changeImage(socket) {
        console.log('changeImage()');
        await this.makeImage();
        socket.emit('imageChange');
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
                const prevStats = fs.statSync(path.join(recordingsDirectory, this.channel + '.ts'));
                setTimeout(async () => {
                    const stats = fs.statSync(path.join(recordingsDirectory, this.channel + '.ts'));
                    const length = await getVideoDurationInSeconds(path.join(recordingsDirectory, this.channel + '.ts'));
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
        fs.existsSync(path.join(imagesDirectory, this.channel + '.jpg')) && fs.rmSync(path.join(imagesDirectory, this.channel + '.jpg'));


        let command = 'ffmpeg -sseof -3 -i '
        command += `"${path.join(recordingsDirectory, this.channel + '.ts')}" `;
        command += '-update 1 -q:v 1 ';
        command += `"${path.join(imagesDirectory, this.channel + '.jpg')}"`;

        try {
            const output = await this.deepExecPromisify(command, process.cwd());
            // console.log(`output`, output);
        } catch (error) {
            console.error(error);
        }

        // this.executeProcess(command, process.cwd(),
        //     (out) => {
        //         //StdOut
        //     },
        //     (err) => {
        //         //StdErr
        //     },
        //     () => {
        //         //Stop(Cleanup)
        //     });
    }

    startRecording() {
        this.channel = 'Sintica'
        const command = `streamlink --output "file.ts" twitch.tv/${this.channel} best`;
        this.recordingProcess = this.executeProcess(command, process.cwd(), console.log, console.error, () => { });
    }

    stopRecording() {
        this.recordingProcess.kill('SIGINT');
    }

    startRendering() {
        const command = `ffmpeg -i input.ts -c copy output.mp4`
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