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

const ADBLOCK_PROXYS = `--twitch-proxy-playlist=http://185.223.29.142:9595`;
// const ADBLOCK_PROXYS = `--twitch-proxy-playlist=https://eu.luminous.dev,https://lb-eu.cdn-perfprod.com,https://eu2.luminous.dev,https://lb-eu3.cdn-perfprod.com`;

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
    if (meta.type == 'error' && meta.error.includes('No playable streams')) {
        console.log('FALSE');

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
                console.log(json);

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


main();


interface SniffEntry {
    twitchStreamerName: string;
    everyxMinute: number;
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

const waiting = ['pokimane', 'potasticp', 'Cinna', 'F1nn5ter', 'fanfan', 'CottontailVA'];

const processes = [] as RecordEntry[];

function ffmpegTimeToSeconds(time: string) {
    const [h, m, s] = time.split(':').map(x => parseInt(x));

    const seconds = (h * 60 * 60) + (m * 60) + s;

    return seconds;
}

async function main() {
    commandManager.registerCommand(new Command(['list', 'l'], 'list', 'Lists currently waiting / active streams', (command, [...args], scope) => {
        return [
            'Record List:',
            '',
            ...waiting.map(x => `  ${x} => Waiting`),
            '',
            ...processes.map(x => `  ${x.twitchStreamerName} => ${x.ffmpegMetadata?.time} - ${x.ffmpegMetadata?.speed}x - ${x.ffmpegMetadata?.birate} - ${parseInt(x.ffmpegMetadata?.size) / 1024}MB`),
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

    setInterval(async () => {
        if (processes.length == 0)
            return;

        for (const process of processes) {
            await process.heartbeat();
        }
    }, 1000);


    let ct = 0;

    // Check every minute if there are any new streams
    setInterval(async () => {
        ct++;

        for (const sniffEntry of sniffEntrys) {
            if (ct % sniffEntry.everyxMinute != 0)
                continue;

            if (!await isLive(this.twitchStreamerName)) {
                console.log('Stream', this.twitchStreamerName, 'is not live!');
                return;
            }

            const meta = await getMetaData(sniffEntry.twitchStreamerName);
            if (meta.type == 'error') {
                console.log('Error getting meta data for', sniffEntry.twitchStreamerName, meta);
                continue;
            }

            if (meta.type == 'success') {
                const entry = new RecordEntry('JODU', sniffEntry.twitchStreamerName);
                await entry.record();
                processes.push(entry);
                entry.recordingFinished(() => {
                    console.log('Recording Finished for', entry);
                    processes.splice(processes.findIndex(e => e.id == entry.id), 1);
                });
            }
        }

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
}

class RecordEntry {
    public id: string;
    public twitchStreamerName: string;
    private userUUID: string;
    public categories: string[];
    public titles: string[];
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
        this.categories = [];
        this.titles = [];
        this.finishedCallbacks = [];
        //TODO: Do math based on user stuff
        // this.maxRecordingTimeSeconds = 8 * 60 * 60;
        this.maxRecordingTimeSeconds = Infinity;
    }

    recordingFinished(cb: () => void) {
        this.finishedCallbacks.push(cb);
    }

    async heartbeat() {

        if (this.ffmpegMetadata != null) {
            const secondsLive = ffmpegTimeToSeconds(this.ffmpegMetadata.time);
            if (secondsLive >= this.maxRecordingTimeSeconds) {
                console.log('Stream', this.twitchStreamerName, 'is too long!');
                this.cleanup();
            }
        }

        if (!await isLive(this.twitchStreamerName)) {
            console.log('Stream', this.twitchStreamerName, 'is not live!');
            return;
        }
        const meta = await getMetaData(this.twitchStreamerName);
        if (meta.type == 'error') {
            console.log('Error getting meta data for', this.twitchStreamerName, meta);
            return;
        }


        if (this.titles.at(-1) != meta.metadata.title) {
            this.titles.push(meta.metadata.title);
        }

        if (this.categories.at(-1) != meta.metadata.category) {
            this.categories.push(meta.metadata.category);
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

        this.titles.push(meta.metadata.title);
        this.categories.push(meta.metadata.category);

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
                this.ffmpegMetadata = { frame, fps, size, time, birate, speed } satisfies FfmpegMetadata;
            }
        });

        this.process.stderr.on('close', this.cleanup);
        this.process.on('exit', this.cleanup);
        this.process.on('close', this.cleanup);
    }
}