const fs = require('fs');
const path = require('path');
const child_process = require('child_process');

const recordingsDirectory = path.join(process.cwd(), 'Recordings')
const imagesDirectory = path.join(process.cwd(), 'previewImages');

class TwitchDownload {
    constructor() {
        this.channel = 'Sintica';
    }

    loadFromID() {

    }

    emitStats() {

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
        const command = `streamlink --output "PATH/FILE.ts" twitch.tv/${this.channel} best`;
    }

    stopRecording() {

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