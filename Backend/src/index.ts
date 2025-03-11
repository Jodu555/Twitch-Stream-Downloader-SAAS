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

const waiting = ['pokimane', 'potasticp', 'Cinna', 'F1nn5ter', 'fanfan', 'CottontailVA'];

const processes = [] as RecordEntry[];

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
        return '';
    }));

    const tmpDir = path.join(__dirname, '..', 'TMP');


    const stats = fs.statfsSync(tmpDir);
    const gbFree = (stats.bsize * stats.bavail) / 1024 / 1024 / 1024;
    console.log('Free Disk Space: ', gbFree, 'GB');

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

    constructor(userUUID: string, twitchStreamerName: string) {
        this.id = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        this.userUUID = userUUID;
        this.twitchStreamerName = twitchStreamerName;
        this.categories = [];
        this.titles = [];
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
        const cleaup = () => {
            if (cleaned) return;
            cleaned = true;
            this.process.kill();
            //TODO: Handle Cleanup Database etc
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

        this.process.stderr.on('close', cleaup);
        this.process.on('exit', cleaup);
        this.process.on('close', cleaup);
    }
}