import fs from 'fs';
import path from 'path';
import { spawn, exec, ChildProcessWithoutNullStreams } from 'child_process';
import { getMetaData, isLive } from './streamLinkHelpers';

interface VideoMeta {
    time: string;
    size: string;
}

interface FfmpegMetadata {
    frame: string;
    fps: string;
    size: string;
    time: string;
    bitrate: string;
    speed: string;
    from: number;
}

interface MetaRepresent {
    title: string;
    category: string;
    time: number;
}


function ffmpegTimeToSeconds(time: string) {
    const [h, m, s] = time.split(':').map(x => parseInt(x));

    const seconds = (h * 60 * 60) + (m * 60) + s;

    return seconds;
}
const WATCHING_LIVE = false;
class RecordEntry {
    public id: string;
    public twitchStreamerName: string;
    private userUUID: string;
    public metas: MetaRepresent[];
    private state: 'WAITING' | 'RECORDING' | 'TRANSCODING' | 'FINISHED' | 'DELETED' = 'WAITING';

    public fnishedAt: number;

    public videoMeta: VideoMeta;
    public ffmpegMetadata: FfmpegMetadata;

    public pid: number;
    private process: ChildProcessWithoutNullStreams;

    public transcodingPid: number;
    private transcodingProcess: ChildProcessWithoutNullStreams;

    private maxRecordingTimeSeconds: number;
    private finishedCallbacks: (() => void)[];
    private cleanup: (() => void) | null;

    public recordingFilePath: string;
    public imageFilePath: string;
    public imageUrl: string;

    private tmpDir: string;

    constructor(userUUID: string, twitchStreamerName: string) {
        this.id = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        this.userUUID = userUUID;
        this.twitchStreamerName = twitchStreamerName;
        this.metas = [];
        this.finishedCallbacks = [];
        //TODO: Do math based on user stuff
        // this.maxRecordingTimeSeconds = 8 * 60 * 60;
        this.maxRecordingTimeSeconds = Infinity;
        this.tmpDir = path.join(__dirname, '..', 'TMP');
    }

    onRecordingFinished(cb: () => void) {
        this.finishedCallbacks.push(cb);
    }

    getState() {
        return this.state;
    }

    async heartbeat() {

        if (!await isLive(this.twitchStreamerName)) {
            console.log('Stream', this.twitchStreamerName, 'is not live!');
            return;
        }
        const meta = await getMetaData(this.twitchStreamerName, false);
        if (meta.type == 'error') {
            console.log('Error getting meta data for', this.twitchStreamerName, meta);
            return;
        }


        const lastMeta = this.metas.at(-1);
        if (lastMeta != null && meta.metadata.title != null && meta.metadata.category != null) {
            if (lastMeta.title != meta.metadata.title || lastMeta.category != meta.metadata.category) {
                this.metas.push({ title: meta.metadata.title, category: meta.metadata.category, time: Date.now() });
            }
        }


        if (this.ffmpegMetadata != null) {
            const secondsLive = ffmpegTimeToSeconds(this.ffmpegMetadata.time);
            if (secondsLive >= this.maxRecordingTimeSeconds) {
                console.log('Metadata outdated with', this.ffmpegMetadata.from - Date.now(), 'ms');

                console.log('Stream', this.twitchStreamerName, 'is too long!');
                this.cleanup();
            }
        }

        // this.captureScreenshot();

    }

    async captureScreenshot() {
        if (WATCHING_LIVE) return;
        if (this.state !== 'RECORDING') return;

        this.imageFilePath = path.join(this.tmpDir, `${this.twitchStreamerName}-${this.id}.png`);
        const genCommand = (offset: number) => {
            let command = `ffmpeg -sseof -${offset} -i "${this.recordingFilePath}"`;
            command += ' -vframes 1 -y ';
            command += `"${this.imageFilePath}"`;
            return command;
        };

        try {
            let output = await this.deepExecPromisify(genCommand(3), process.cwd());
            if (fs.existsSync(this.imageFilePath)) {
                this.imageUrl = `http://138.201.131.52:8081/api/v1/streamers/image/${this.id}?time=${new Date().getTime()}`;
                return;
            }

            output = await this.deepExecPromisify(genCommand(10), process.cwd());
            if (fs.existsSync(this.imageFilePath)) {
                this.imageUrl = `http://138.201.131.52:8081/api/v1/streamers/image/${this.id}?time=${new Date().getTime()}`;
                return;
            }
        } catch (error) {
            console.error(error);
        }

    }

    private async deepExecPromisify(command: string, cwd: string) {
        return await new Promise((resolve, reject) => {
            exec(command, { encoding: 'utf8', cwd }, (error, stdout, stderr) => {
                // console.log({ error, stdout, stderr });
                if (error) {
                    reject({ error, stdout: stdout?.trim()?.split('\n'), stderr: stderr?.trim()?.split('\n') });
                }
                resolve([...stdout?.split('\n'), ...stderr?.split('\n')]);
            });
        });
    }

    async stopRecordAndTranscode() {
        if (this.state != 'RECORDING')
            return;
        await this.cleanup();
    }

    async record() {
        if (!await isLive(this.twitchStreamerName)) {
            console.log('Stream', this.twitchStreamerName, 'is not live!');
            return;
        }
        const meta = await getMetaData(this.twitchStreamerName);

        if (meta.type == 'error') {
            console.log('Error getting meta data for', this.twitchStreamerName, meta);
            return;
        }

        this.metas.push({ title: meta.metadata.title, category: meta.metadata.category, time: Date.now() });





        this.state = 'RECORDING';



        // -hls_segment_filename "segment_%07d.ts" -master_pl_name "output.m3u8" "playlist.m3u8"
        if (WATCHING_LIVE) {
            //The Portion to be able to watch live
            this.recordingFilePath = path.join(this.tmpDir, 'hls', `${this.twitchStreamerName}-${this.id}`, `master.m3u8`);
            fs.mkdirSync(path.join(this.recordingFilePath, '..'), { recursive: true });
            this.process = spawn('ffmpeg', [
                '-i', meta.streams.best.master,
                '-f', 'hls',
                '-hls_time', '3',
                '-hls_playlist_type', 'event',
                '-hls_segment_filename', `${path.join(this.recordingFilePath, '..', 'segment_%07d.ts')}`,
                this.recordingFilePath
            ], {
                cwd: this.tmpDir,
            });
        } else {
            this.recordingFilePath = path.join(this.tmpDir, `${this.twitchStreamerName}-${this.id}.ts`);
            fs.mkdirSync(path.join(this.recordingFilePath, '..'), { recursive: true });
            this.process = spawn('ffmpeg', [
                '-i', meta.streams.best.master,
                '-c', 'copy',
                this.recordingFilePath
            ], {
                cwd: this.tmpDir,
            });
        }


        this.pid = this.process.pid;

        let cleaned = false;
        this.cleanup = async () => {
            if (cleaned) return;
            cleaned = true;
            this.process.kill();
            // this.process.kill('SIGKILL');
            //TODO: Handle Cleanup Database etc
            this.videoMeta = {
                time: this.ffmpegMetadata?.time,
                size: this.ffmpegMetadata?.size,
            };
            console.log('Cleaned up for ', this);
            // this.finishedCallbacks.forEach(x => x());
            await this.startTranscoding();
        };

        this.process.stderr.on('data', (message) => {
            message = message.toString();
            const re = /frame=(.*)fps=(.*)q=(.*)size=(.*)time=(.*)bitrate=(.*)speed=(.*)x/gi;
            const match = re.exec(message);
            if (match != null) {
                const [_, frame, fps, __, size, time, bitrate, speed] = match.map(x => x.trim());
                this.ffmpegMetadata = { frame, fps, size, time, bitrate, speed, from: Date.now() } satisfies FfmpegMetadata;
            }
        });

        this.process.stderr.on('close', this.cleanup);
        this.process.on('exit', this.cleanup);
        this.process.on('close', this.cleanup);
    }

    async startTranscoding() {
        if (this.state != 'RECORDING')
            return;

        this.state = 'TRANSCODING';

        const tmpDir = path.join(__dirname, '..', 'TMP');

        const outputFilePath = path.join(tmpDir, `${this.twitchStreamerName}-${this.id}.mp4`);

        this.transcodingProcess = spawn('ffmpeg', [
            '-i', this.recordingFilePath,
            '-c', 'copy',
            outputFilePath
        ], {
            cwd: this.tmpDir,
        });
        this.transcodingPid = this.transcodingProcess.pid;

        let cleaned = false;
        this.cleanup = () => {
            if (cleaned) return;
            cleaned = true;
            this.process.kill();
            // this.process.kill('SIGKILL');
            //TODO: Handle Cleanup Database etc
            console.log('Cleaned up for ', this);

            //Delete the video file
            fs.rmSync(this.recordingFilePath, { force: true });
            fs.rmSync(this.imageFilePath, { force: true });
            this.state = 'FINISHED';
            this.finishedCallbacks.forEach(x => x());
            this.fnishedAt = Date.now();
        };

        this.transcodingProcess.stderr.on('data', (message) => {
            message = message.toString();
            const re = /frame=(.*)fps=(.*)q=(.*)size=(.*)time=(.*)bitrate=(.*)speed=(.*)x/gi;
            const match = re.exec(message);
            if (match != null) {
                const [_, frame, fps, __, size, time, bitrate, speed] = match.map(x => x.trim());
                this.ffmpegMetadata = { frame, fps, size, time, bitrate, speed, from: Date.now() } satisfies FfmpegMetadata;
            }
        });

        this.transcodingProcess.stderr.on('close', this.cleanup);
        this.transcodingProcess.on('exit', this.cleanup);
        this.transcodingProcess.on('close', this.cleanup);
    }
}

export default RecordEntry;