import express from 'express';
import axios from 'axios';
import morgan from 'morgan';
import { CommandManager, Command } from '@jodu555/commandmanager';
import path from 'path';
import fs from 'fs';

//                                              Pass here the standard pipe you want to use
const commandManager = CommandManager.createCommandManager(process.stdin, process.stdout);

import { spawn, exec, ChildProcessWithoutNullStreams } from 'child_process';

const STREAM_URL = `https://twitch.tv/`;

// const ADBLOCK_PROXYS = `--twitch-proxy-playlist=http://185.223.29.142:9595`;
const ADBLOCK_PROXYS = `--twitch-proxy-playlist=https://eu.luminous.dev,https://lb-eu.cdn-perfprod.com,https://eu2.luminous.dev,https://lb-eu3.cdn-perfprod.com`;

interface TwitchMeta {
    type: 'success';
    plugin: 'twitch';
    metadata: {
        id: string;
        author: string;
        category: string;
        title: string;
    };
    streams: {
        [key: string]: {
            type: 'hls';
            url: string;
            headers: any;
            master: string;
        };
    };
}

async function isLive(streamerName: string) {
    const meta = await getMetaData(streamerName, false);
    // if (meta.type == 'error' && meta.error.includes('No playable streams')) {
    //     console.log('FALSE');
    if (meta.type == 'error') {
        return false;
    }
    return true;
}

interface TwitchMetaError {
    type: 'error';
    error: string;
}

function getMetaData(streamerName: string, useProxys = true): Promise<TwitchMeta | TwitchMetaError> {
    return new Promise((resolve, reject) => {
        exec(`streamlink --json ${useProxys ? ADBLOCK_PROXYS : ''} ${STREAM_URL}${streamerName}`, (err, stdout, stderr) => {
            try {
                const json = JSON.parse(stdout);
                // console.log(json);

                if (json.error) {
                    resolve({ type: 'error', error: json.error });
                    return;
                }
                json.type == 'success';
                resolve(json);
            } catch (error) {
                console.log('Error parsing JSON', error);

                reject(error);
            }
        });
    });
}

function bytesToHumanReadable(size: number, breakSize = 1024) {
    let u = 0;
    while (size >= breakSize || -size >= breakSize) {
        size /= breakSize;
        u++;
    }
    return (u ? size.toFixed(1) + ' ' : size) + ' KMGTPEZY'[u] + 'B';
}


main();


interface SniffEntry {
    twitchStreamerName: string;
    everyxMinute: number;
    users?: string[];
}

const sniffEntrys = [
    {
        twitchStreamerName: 'pokimane',
        everyxMinute: 1,
    },
    {
        twitchStreamerName: 'potasticp',
        everyxMinute: 1,
    },
    {
        twitchStreamerName: 'Cinna',
        everyxMinute: 1,
    },
    {
        twitchStreamerName: 'F1nn5ter',
        everyxMinute: 1
    },
    {
        twitchStreamerName: 'fanfan',
        everyxMinute: 1,
    },
    {
        twitchStreamerName: 'CottontailVA',
        everyxMinute: 1,
    },
] satisfies SniffEntry[];

const processes = [] as RecordEntry[];

function ffmpegTimeToSeconds(time: string) {
    const [h, m, s] = time.split(':').map(x => parseInt(x));

    const seconds = (h * 60 * 60) + (m * 60) + s;

    return seconds;
}

async function main() {
    commandManager.registerCommand(new Command(['list', 'l'], 'list', 'Lists currently waiting / active streams', (command, [...args], scope) => {
        console.log(processes.map(x => x.metas));

        return [
            'Record List:',
            '',
            ...sniffEntrys.map(x => `  ${x.twitchStreamerName} => Waiting (every ${x.everyxMinute} minute${x.everyxMinute > 1 ? 's' : ''})`),
            '',
            ...processes.map(x => `  ${x.twitchStreamerName} => ${x.ffmpegMetadata?.time} - ${x.ffmpegMetadata?.speed}x - ${x.ffmpegMetadata?.birate} - ${bytesToHumanReadable(parseInt(x.ffmpegMetadata?.size))}`),
        ];
    }));

    commandManager.registerCommand(new Command(['record', 'r'], 'record <Name>', 'Records a new stream', async (command, [...args], scope) => {
        const streamer = args[1];
        const entry = new RecordEntry('JODU', streamer);
        await entry.record();
        processes.push(entry);
        entry.recordingFinished(() => {
            console.log('Recording Finished for', entry);
            processes.splice(processes.findIndex(e => e.id == entry.id), 1);
        });
        return '';
    }));


    const tmpDir = path.join(__dirname, '..', 'TMP');


    const stats = fs.statfsSync(tmpDir);
    const gbFree = (stats.bsize * stats.bavail) / 1024 / 1024 / 1024;
    console.log('Free Disk Space: ', gbFree, 'GB');


    let ct = 0;

    // Check every minute if there are any new streams
    setInterval(async () => {
        ct++;

        await Promise.all(processes.map(process => process.heartbeat()));

        // for (const sniffEntry of sniffEntrys) {
        //     if (ct % sniffEntry.everyxMinute != 0)
        //         continue;

        //     if (!await isLive(sniffEntry.twitchStreamerName)) {
        //         console.log('Stream', sniffEntry.twitchStreamerName, 'is not live!');
        //         continue;
        //     }
        //     const entry = new RecordEntry('JODU', sniffEntry.twitchStreamerName);
        //     await entry.record();
        //     processes.push(entry);
        //     entry.recordingFinished(() => {
        //         console.log('Recording Finished for', entry);
        //         processes.splice(processes.findIndex(e => e.id == entry.id), 1);
        //     });
        // }

        if (ct >= Number.MAX_SAFE_INTEGER - 55)
            ct = 0;

    }, 1000 * 60);

}

interface FfmpegMetadata {
    frame: string;
    fps: string;
    size: string;
    time: string;
    birate: string;
    speed: string;
    from: number;
}

interface MetaRepresent {
    title: string;
    category: string;
    time: number;
}

class RecordEntry {
    public id: string;
    public twitchStreamerName: string;
    private userUUID: string;
    public metas: MetaRepresent[];
    public pid: number;
    private process: ChildProcessWithoutNullStreams;
    public ffmpegMetadata: FfmpegMetadata;
    private maxRecordingTimeSeconds: number;
    private finishedCallbacks: (() => void)[];
    private cleanup: (() => void) | null;

    constructor(userUUID: string, twitchStreamerName: string) {
        this.id = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        this.userUUID = userUUID;
        this.twitchStreamerName = twitchStreamerName;
        this.metas = [];
        this.finishedCallbacks = [];
        //TODO: Do math based on user stuff
        // this.maxRecordingTimeSeconds = 8 * 60 * 60;
        this.maxRecordingTimeSeconds = Infinity;
    }

    recordingFinished(cb: () => void) {
        this.finishedCallbacks.push(cb);
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
        if (lastMeta != null) {
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

        const tmpDir = path.join(__dirname, '..', 'TMP');

        this.process = spawn('ffmpeg', [
            '-i', meta.streams.best.master,
            '-c', 'copy',
            path.join(tmpDir, `${this.twitchStreamerName}-${this.id}.mp4`)
        ], {
            cwd: tmpDir,
        });
        this.pid = this.process.pid;

        let cleaned = false;
        this.cleanup = () => {
            if (cleaned) return;
            cleaned = true;
            this.process.kill();
            // this.process.kill('SIGKILL');
            //TODO: Handle Cleanup Database etc
            console.log('Cleaned up for ', this);
            this.finishedCallbacks.forEach(x => x());
        };

        this.process.stderr.on('data', (message) => {
            message = message.toString();
            const re = /frame=(.*)fps=(.*)q=(.*)size=(.*)time=(.*)bitrate=(.*)speed=(.*)x/gi;
            const match = re.exec(message);
            if (match != null) {
                const [_, frame, fps, __, size, time, birate, speed] = match.map(x => x.trim());
                this.ffmpegMetadata = { frame, fps, size, time, birate, speed, from: Date.now() } satisfies FfmpegMetadata;
            }
        });

        this.process.stderr.on('close', this.cleanup);
        this.process.on('exit', this.cleanup);
        this.process.on('close', this.cleanup);
    }
}