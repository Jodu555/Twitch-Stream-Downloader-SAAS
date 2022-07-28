const fs = require('fs');
const path = require('path');
const child_process = require('child_process');

const { getVideoDurationInSeconds } = require('get-video-duration');
const { getIO } = require('../utils/utils');

const recordingsDirectory = path.join(process.cwd(), 'Recordings')
const imagesDirectory = path.join(process.cwd(), 'previewImages');

class TwitchDownload {
    constructor() {
        this.channel = 'Sintica';
        this.recordingProcess;
    }

    loadFromID() {

    }

    async emitStats() {

        const { length, size, speed } = await this.collectStats();


        console.log({ length, size, speed });

        const date = new Date(0);
        date.setSeconds(length);
        console.log(`Geschwindigkeit: ${this.getReadableSizeString(speed)}/s`);
        console.log(`Größe: ${this.getReadableSizeString(size)}`);
        console.log(`Länge: ${date.toISOString().substr(11, 8)}`);


        (await getIO().fetchSockets()).forEach(socket => {
            // console.log(socket.auth);
            socket.emit('stats', { length, size, speed });
        });

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
        const filename = 'basti.ts';
        return new Promise((resolve, reject) => {
            try {
                const prevStats = fs.statSync(path.join(recordingsDirectory, filename));
                setTimeout(async () => {
                    const stats = fs.statSync(path.join(recordingsDirectory, filename));
                    const length = await getVideoDurationInSeconds(path.join(recordingsDirectory, filename));
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
        let command = 'ffmpeg -sseof -3 -i '
        command += `"${path.join(recordingsDirectory, 'out.ts')}" `;
        command += '-update 1 -q:v 1 ';
        command += `"${path.join(imagesDirectory, 'out.jpg')}"`;

        // try {
        //     const output = await this.deepExecPromisify(command, process.cwd());
        //     console.log(`output`, output);
        // } catch (error) {
        //     console.error(error);
        // }

        this.executeProcess(command, process.cwd(),
            (out) => {
                //StdOut
            },
            (err) => {
                //StdErr
            },
            () => {
                //Stop(Cleanup)
            });
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
                console.log({ error, stdout, stderr });
                if (error) {
                    reject({ error, stdout: stdout?.trim()?.split('\n'), stderr: stderr?.trim()?.split('\n') });
                }
                resolve([...stdout?.split('\n'), ...stderr?.split('\n')]);
            });
        })
    }


}

module.exports = TwitchDownload;