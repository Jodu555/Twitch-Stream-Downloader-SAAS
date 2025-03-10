import express from 'express';
import axios from 'axios';
import morgan from 'morgan';
import { CommandManager, Command } from '@jodu555/commandmanager';
import path from 'path';
//                                              Pass here the standard pipe you want to use
const commandManager = CommandManager.createCommandManager(process.stdin, process.stdout);

import { spawn, exec } from 'child_process';

const STREAM_URL = `https://twitch.tv/`;

const ADBLOCK_PROXYS = `--twitch-proxy-playlist=http://185.223.29.142:9595`;
// const ADBLOCK_PROXYS = `--twitch-proxy-playlist=https://eu.luminous.dev,https://lb-eu.cdn-perfprod.com,https://eu2.luminous.dev,https://lb-eu3.cdn-perfprod.com`;

interface TwitchMeta {
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

function getMetaData(streamerName: string) {
    return new Promise<TwitchMeta>((resolve, reject) => {
        exec(`streamlink --json ${ADBLOCK_PROXYS} ${STREAM_URL}${streamerName}`, (err, stdout, stderr) => {
            try {
                const json = JSON.parse(stdout) as TwitchMeta;
                resolve(json);
            } catch (error) {
                reject(error);
            }
        });
    });
}

async function recordStream(streamerName: string) {
    const meta = await getMetaData(streamerName);

    const tmpDir = path.join(__dirname, '..', 'TMP');

    const proc = spawn('ffmpeg', [
        '-i', meta.streams.best.master,
        '-c', 'copy',
        path.join(tmpDir, 'out.mp4')
    ], {
        cwd: tmpDir,
    });

    proc.stderr.on('data', (message) => {
        message = message.toString();
        const re = /frame=(.*)fps=(.*)q=(.*)size=(.*)time=(.*)bitrate=(.*)speed=(.*)x/gi;
        const match = re.exec(message);
        if (match != null) {
            const [_, frame, fps, __, size, time, birate, speed] = match.map(x => x.trim());
            console.log({ frame, fps, size, time, birate, speed });

        }
    });

}

main();

const waiting = ['pokimane', 'potasticp', 'Cinna', 'F1nn5ter', 'fanfan', 'CottontailVA'];

async function main() {
    commandManager.registerCommand(new Command(['list', 'l'], 'list', 'Lists currently waiting / active streams', (command, [...args], scope) => {
        return [
            'Record List:',
            '',
            ...waiting.map(x => `  ${x} => Waiting`),
            '',
        ];
    }));

    commandManager.registerCommand(new Command(['record', 'r'], 'record <Name>', 'Records a new stream', (command, [...args], scope) => {
        const streamer = args[1];
        recordStream(streamer);
    }));
}

class RecordEntry {
    private id: string;
    private twitchUsername: string;
    private userUUID: string;
    public categories: string[];
    public titles: string[];
    public fileSize: number;
}

async function spawnFFmpegProcess(command: string, cwd: string = undefined, progress: (speed: number, percent: number) => void) {
    return new Promise<{ code: number; output: string[]; duration: { h: number; m: number; s: number; }; highestSpeed: number; }>((resolve, reject) => {
        const proc = spawn(command, { shell: true, cwd: cwd });
        console.log(proc.pid);
        let duration: { h: number; m: number; s: number; } = null;
        let highestSpeed: number = 0;
        let cumOutput = [];

        let latestUpdate = Date.now();

        let timeout = setTimeout(() => {
            const err = new Error('Timeout Reached: ' + JSON.stringify(cumOutput, null, 3));
            reject(err);
        }, 1000 * 60 * 1);

        let interval = setInterval(() => {
            const sAgo = (Date.now() - latestUpdate) / 1000;
            if (sAgo > 5) {
                console.log('Last Update ' + sAgo + 's ago');
            }

            if (sAgo > 60 * 7) {
                console.log('No output for 7 minutes, killing process', sAgo);
                proc.kill();
                clearInterval(interval);
                reject(new Error('No output for 7 minutes, killing process: ' + JSON.stringify(cumOutput, null, 3)));
            }
        }, 1000);

        proc.stderr.setEncoding('utf8');
        proc.stderr.on('data', (data: string) => {
            if (data == undefined) return;
            const lines = data.split('\n');
            lines.forEach((line) => {
                if (line.includes('frame=') && line.includes('fps=') && line.includes('time=')) {
                    if (duration == null) {
                        try {
                            const l = cumOutput.join(' ').trim().replaceAll('\r', '').replaceAll('\n', '').replaceAll('\t', '');
                            const [_, rest] = l.split('Duration: ');
                            const [time, __] = rest.split(',');
                            const [h, m, sc] = time.split(':');
                            const s = parseInt(sc);
                            duration = { h: Number(h), m: Number(m), s };
                        } catch (_) { }
                    }
                    try {
                        const speed = parseFloat(line.split('speed=')[1].split('x')[0]);
                        const [time, __] = line.split('time=')[1].split(' ');
                        const [h, m, sc] = time.split(':');

                        const s = parseInt(sc);
                        const seconds = s + Number(m) * 60 + Number(h) * 60 * 60;
                        const maxSeconds = duration.s + duration.m * 60 + duration.h * 60 * 60;

                        const percent = (seconds / maxSeconds) * 100;

                        if (speed > highestSpeed) highestSpeed = speed;
                        latestUpdate = Date.now();
                        progress(speed, percent);
                        if (timeout) {
                            clearTimeout(timeout);
                            timeout = null;
                        }
                    } catch (_) { }
                }
            });
            cumOutput.push(...lines);
            // console.log('stderr: ', lines);
        });

        proc.on('close', (code) => {
            clearInterval(interval);
            clearTimeout(timeout);
            if (code == 0) {
                resolve({ code, output: cumOutput, duration, highestSpeed });
            } else {
                reject({ code, output: cumOutput, duration, highestSpeed });
            }
        });
    });
}