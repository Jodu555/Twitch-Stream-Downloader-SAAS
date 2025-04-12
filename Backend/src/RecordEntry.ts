import fs from 'fs';
import path from 'path';
import { spawn, exec, ChildProcessWithoutNullStreams } from 'child_process';
import { getMetaData, isLive } from './streamLinkHelpers';
import { Database } from '@jodu555/mysqlapi';
import { DatabaseRecordEntry } from './utils/types';
import { io } from '.';

const database = Database.getDatabase();

export interface VideoMeta {
    time: string;
    size: string;
}

export interface FfmpegMetadata {
    frame: string;
    fps: string;
    size: string;
    time: string;
    bitrate: string;
    speed: string;
    from: number;
}

export interface MetaRepresent {
    title: string;
    category: string;
    time: number;
}

export type RecordEntryState = 'WAITING' | 'RECORDING' | 'TRANSCODING' | 'FINISHED' | 'DELETED';

function ffmpegTimeToSeconds(time: string) {
    const [h, m, s] = time.split(':').map(x => parseInt(x));

    const seconds = (h * 60 * 60) + (m * 60) + s;

    return seconds;
}
class RecordEntry {
    private tmpDir: string;

    public id: string;
    public twitchStreamerName: string;
    public userUUID: string;
    public metas: MetaRepresent[];
    public watchingLive: boolean;
    private state: RecordEntryState;

    public createdAt: number;
    public finishedAt: number;
    public deletedAt: number;

    public videoMeta: VideoMeta;
    public ffmpegMetadata: FfmpegMetadata;

    public pid: number;
    private process: ChildProcessWithoutNullStreams;

    public transcodingPid: number;
    private transcodingProcess: ChildProcessWithoutNullStreams;

    private maxRecordingTimeSeconds: number;
    private finishedCallbacks: (() => void)[];
    private cleanup: (() => Promise<void>) | null;

    public outputFilePath: string;
    public recordingFilePath: string;
    public imageFilePath: string;
    public imageUrl: string;

    private notLiveAttempts: number;

    constructor(userUUID: string, twitchStreamerName: string, watchingLive?: boolean) {
        this.id = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        this.userUUID = userUUID;
        this.twitchStreamerName = twitchStreamerName;
        this.metas = [];
        this.finishedCallbacks = [];
        //TODO: Do math based on user stuff
        // this.maxRecordingTimeSeconds = 8 * 60 * 60;
        this.maxRecordingTimeSeconds = Infinity;
        this.tmpDir = path.join(__dirname, '..', 'TMP');
        this.watchingLive = watchingLive ?? false;
        this.notLiveAttempts = 0;
        this.outputFilePath = path.join(this.tmpDir, `${this.twitchStreamerName}-${this.id}.mp4`);
        this.createdAt = Date.now();
    }

    static fromDatabase(entry: DatabaseRecordEntry) {
        const record = new RecordEntry(entry.userUUID, entry.twitchStreamerName, false);
        record.id = entry.ID;
        record.state = entry.state;
        record.metas = JSON.parse(entry.metas);
        record.videoMeta = JSON.parse(entry.videoMeta);
        record.recordingFilePath = entry.recordingFilePath;
        record.outputFilePath = entry.outputFilePath;
        record.createdAt = entry.createdAt;
        record.finishedAt = entry.finishedAt;
        record.deletedAt = entry.deletedAt;
        record.imageFilePath = entry.imageFilePath;
        record.imageUrl = entry.imageUrl;
        return record;
    }

    toFrontend() {
        return {
            id: this.id,
            twitchStreamerName: this.twitchStreamerName,
            metas: this.metas,
            state: this.getState(),
            watchingLive: this.watchingLive,
            createdAt: this.createdAt,
            deletedAt: this.deletedAt,
            finishedAt: this.finishedAt,
            pid: this.pid,
            videoMeta: this.videoMeta,
            ffmpegMetadata: this.ffmpegMetadata,
            transcodingPid: this.transcodingPid,
            recordingFilePath: this.recordingFilePath,
            outputFilePath: this.outputFilePath,
            imageFilePath: this.imageFilePath,
            imageUrl: this.imageUrl,
        };
    }

    async createRecordInDatabase() {
        await database.get<DatabaseRecordEntry>('recordEntries').create({
            ID: this.id,
            twitchStreamerName: this.twitchStreamerName,
            userUUID: this.userUUID,
            state: this.state,
            metas: JSON.stringify(this.metas, null, 3),
            videoMeta: JSON.stringify(this.videoMeta, null, 3),
            recordingFilePath: this.recordingFilePath,
            outputFilePath: this.outputFilePath,
            imageFilePath: this.imageFilePath,
            imageUrl: this.imageUrl,
            finishedAt: this.finishedAt,
            createdAt: this.createdAt,
            deletedAt: this.deletedAt,
        });
    }

    async updateRecordInDatabaseAndSockets() {
        await database.get<DatabaseRecordEntry>('recordEntries').update({ ID: this.id }, {
            twitchStreamerName: this.twitchStreamerName,
            userUUID: this.userUUID,
            state: this.state,
            metas: JSON.stringify(this.metas, null, 3),
            videoMeta: JSON.stringify(this.videoMeta, null, 3),
            recordingFilePath: this.recordingFilePath,
            imageFilePath: this.imageFilePath,
            imageUrl: this.imageUrl,
            finishedAt: this.finishedAt,
            createdAt: this.createdAt,
            deletedAt: this.deletedAt,
        });
        (await io.fetchSockets()).forEach(x => x.emit('recordingUpdate', { ID: this.id, data: this.toFrontend() }));
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
            this.notLiveAttempts++;
            if (this.notLiveAttempts > 5) {
                if (this.state == 'RECORDING') {
                    await this.cleanup();
                }
                return;
            }
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

        await this.updateRecordInDatabaseAndSockets();

        // this.captureScreenshot();

    }

    async captureScreenshot() {
        if (this.watchingLive) return;
        if (this.state !== 'RECORDING') return;

        this.imageFilePath = path.join(this.tmpDir, `${this.twitchStreamerName}-${this.id}.png`);
        const genCommand = (offset: number) => {
            let command = `ffmpeg -sseof -${offset} -i "${this.recordingFilePath}"`;
            command += ' -vframes 1 -y ';
            command += `"${this.imageFilePath}"`;
            return command;
        };

        try {
            const backOptions = [3, 10, 15];

            for await (const back of backOptions) {
                const output = await this.deepExecPromisify(genCommand(back), process.cwd());
                if (fs.existsSync(this.imageFilePath)) {
                    this.imageUrl = `http://138.201.131.52:8081/api/v1/streamers/image/${this.id}?time=${new Date().getTime()}`;
                    await this.updateRecordInDatabaseAndSockets();
                    return;
                }
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

    async callCleanup() {
        await this.updateRecordInDatabaseAndSockets();
        await this.cleanup();
        await this.updateRecordInDatabaseAndSockets();
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
        await this.createRecordInDatabase();

        // -hls_segment_filename "segment_%07d.ts" -master_pl_name "output.m3u8" "playlist.m3u8"
        if (this.watchingLive) {
            //The Portion to be able to watch live
            this.recordingFilePath = path.join(this.tmpDir, 'hls', `${this.twitchStreamerName}-${this.id}`, `master.m3u8`);
            fs.mkdirSync(path.join(this.recordingFilePath, '..'), { recursive: true });

            this.process = spawn('ffmpeg', [
                '-i', meta.streams.best.master,
                '-c', 'copy',
                '-f', 'hls',
                '-hls_time', '2',
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
        await this.updateRecordInDatabaseAndSockets();


        this.pid = this.process.pid;

        let cleaned = false;
        this.cleanup = async () => {
            if (cleaned) return;
            cleaned = true;
            this.process.kill();
            if (!this.process.killed) {
                this.process.kill('SIGKILL');
            }
            this.videoMeta = {
                time: this.ffmpegMetadata?.time,
                size: this.ffmpegMetadata?.size,
            };
            console.log('Cleaned up for ', this.toFrontend());
            await this.updateRecordInDatabaseAndSockets();
            await this.startTranscoding();
        };

        const getDirSize = () => {
            const dir = path.join(this.recordingFilePath, '..');
            const files = fs.readdirSync(dir);
            return files.filter(x => !x.endsWith('.tmp')).map(x => fs.statSync(path.join(dir, x)).size).reduce((x, acc) => x + acc, 0);
        };

        const cache = {
            time: Date.now(),
            size: '0',
        };

        this.process.stderr.on('data', async (message) => {
            message = message.toString();
            const re = /frame=(.*)fps=(.*)q=(.*)size=(.*)time=(.*)bitrate=(.*)speed=(.*)x/gi;
            const match = re.exec(message);
            if (match != null) {
                const [_, frame, fps, __, size, time, bitrate, speed] = match.map(x => x.trim());

                if (this.watchingLive) {
                    const cacheTime = cache.time;
                    if (Date.now() >= (cacheTime + 1000 * 5)) {
                        cache.size = getDirSize().toString();
                        cache.time = Date.now();
                    }
                    cache.size = cache.size;
                    this.ffmpegMetadata = { frame, fps, size: cache.size, time, bitrate: "0", speed: speed, from: Date.now() } satisfies FfmpegMetadata;
                } else {
                    const cacheTime = cache.time;
                    if (Date.now() >= (cacheTime + 1000 * 2)) {
                        cache.size = fs.statSync(this.recordingFilePath).size.toString();
                        cache.time = Date.now();
                    }
                    this.ffmpegMetadata = { frame, fps, size: cache.size, time, bitrate, speed, from: Date.now() } satisfies FfmpegMetadata;
                }
                (await io.fetchSockets()).forEach(x => x.emit('recordingUpdate', { ID: this.id, data: this.toFrontend() }));
            }
        });

        this.process.stderr.on('close', this.cleanup);
        this.process.on('exit', this.cleanup);
        this.process.on('close', this.cleanup);
    }

    private async startTranscoding() {
        if (this.state != 'RECORDING')
            return;

        this.state = 'TRANSCODING';

        await this.updateRecordInDatabaseAndSockets();
        this.transcodingProcess = spawn('ffmpeg', [
            '-i', this.recordingFilePath,
            '-c', 'copy',
            this.outputFilePath
        ], {
            cwd: this.tmpDir,
        });
        this.transcodingPid = this.transcodingProcess.pid;

        let cleaned = false;
        this.cleanup = async () => {
            if (cleaned) return;
            cleaned = true;
            this.process.kill();
            // this.process.kill('SIGKILL');
            //TODO: Handle Cleanup Database etc
            console.log('Cleaned up for ', this.toFrontend());

            //Delete the video file
            try {
                if (this.watchingLive) {
                    fs.rmSync(path.join(this.recordingFilePath, '..'), { recursive: true, force: true });
                } else {
                    fs.rmSync(this.recordingFilePath, { force: true });
                    this.imageFilePath && fs.rmSync(this.imageFilePath, { force: true });
                }
            } catch (error) {
                console.log('Error on deleting the tmp video files', error);
            }
            this.state = 'FINISHED';
            this.finishedCallbacks.forEach(x => x());
            this.finishedAt = Date.now();
            await this.updateRecordInDatabaseAndSockets();
        };
        await this.updateRecordInDatabaseAndSockets();

        const cache = {
            time: Date.now(),
            size: '0',
        };

        this.transcodingProcess.stderr.on('data', (message) => {
            message = message.toString();
            const re = /frame=(.*)fps=(.*)q=(.*)size=(.*)time=(.*)bitrate=(.*)speed=(.*)x/gi;
            const match = re.exec(message);
            if (match != null) {
                const [_, frame, fps, __, size, time, bitrate, speed] = match.map(x => x.trim());
                const cacheTime = cache.time;
                if (Date.now() >= (cacheTime + 1000 * 2)) {
                    cache.size = fs.statSync(this.outputFilePath).size.toString();
                    cache.time = Date.now();
                }
                this.ffmpegMetadata = { frame, fps, size: cache.size, time, bitrate, speed, from: Date.now() } satisfies FfmpegMetadata;
            }
        });

        this.transcodingProcess.stderr.on('close', this.cleanup);
        this.transcodingProcess.on('exit', this.cleanup);
        this.transcodingProcess.on('close', this.cleanup);
    }

    async delete() {
        this.state = 'DELETED';
        this.deletedAt = Date.now();
        await this.updateRecordInDatabaseAndSockets();
    }
}

export default RecordEntry;