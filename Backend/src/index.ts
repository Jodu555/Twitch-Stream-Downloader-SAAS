import { Command, CommandManager } from '@jodu555/commandmanager';
import cors from 'cors';
import express from 'express';
import fs from 'fs';
import morgan from 'morgan';
import path from 'path';
import dotenv from 'dotenv';
dotenv.config();

import { Database } from '@jodu555/mysqlapi';
const database = Database.createDatabase(process.env.DB_HOST, 'twitcher', process.env.DB_PASSWORD, 'twitch-stream-downloader');
database.connect();

import RecordEntry, { MetaRepresent, RecordEntryState, VideoMeta } from './RecordEntry';
import { formatNumPrec, bytesToHumanReadable } from './utils';
import { isLive } from './streamLinkHelpers';

const app = express();

app.use(express.json());

// app.use(morgan('dev'));
app.use(cors());

database.createTable('sniffEntries', {
    userUUID: {
        type: 'varchar(64)',
    },
    twitchStreamerName: {
        type: 'varchar(64)',
    },
    everyxMinute: {
        type: 'INT',
    },
    lastCheck: {
        type: 'BIGINT',
    },
});

export interface DatabaseRecordEntry {
    ID: string;
    twitchStreamerName: string;
    userUUID: string;
    state: RecordEntryState;
    metas: MetaRepresent[];
    videoMeta: VideoMeta;
    recordingFilePath: string;
    imageFilePath: string;
    imageUrl: string;
}

database.createTable('recordEntries', {
    options: {
        PK: 'ID',
    },
    ID: {
        type: 'varchar(64)',
        null: false,
    },
    twitchStreamerName: {
        type: 'varchar(64)',
        null: false,
    },
    userUUID: {
        type: 'varchar(64)',
        null: false,
    },
    state: {
        type: 'VARCHAR(32)',
        null: false,
    },
    metas: {
        type: 'JSON',
        null: false,
    },
    videoMeta: {
        type: 'JSON',
        null: false,
    },
    recordingFilePath: {
        type: 'varchar(255)',
        null: false,
    },
    imageFilePath: {
        type: 'varchar(255)',
    },
    imageUrl: {
        type: 'varchar(255)',
    }
});

function translateRecordForFrontend(x: RecordEntry) {
    return {
        id: x.id,
        twitchStreamerName: x.twitchStreamerName,
        metas: x.metas,
        state: x.getState(),
        watchingLive: x.watchingLive,
        finishedAt: x.finishedAt,
        pid: x.pid,
        videoMeta: x.videoMeta,
        ffmpegMetadata: x.ffmpegMetadata,
        transcodingPid: x.transcodingPid,
        recordingFilePath: x.recordingFilePath,
        imageFilePath: x.imageFilePath,
        imageUrl: x.imageUrl,
    };
}

app.get('/api/v1/streamers', async (req, res) => {
    res.json(processes.filter(x => x.getState() != 'FINISHED').map(translateRecordForFrontend));
});

app.get('/api/v1/videos', async (req, res) => {
    res.json(processes.filter(x => x.getState() == 'FINISHED').map(translateRecordForFrontend));
});

app.get('/api/v1/streamers/record/:name/:watchLive?', async (req, res) => {
    const twitchUsername = req.params.name;
    const watchLive = req.params.watchLive == 'true';
    const entry = new RecordEntry('JODU', twitchUsername, watchLive);
    await entry.record();
    processes.push(entry);
    entry.onRecordingFinished(() => {
        console.log('Recording Finished for', entry);
    });
    res.json({
        id: entry.id,
        twitchStreamerName: entry.twitchStreamerName,
        watchLive,
    });
});

app.delete('/api/v1/videos/:id', async (req, res) => {
    const process = processes.find(x => x.id == req.params.id);
    if (process == null) {
        res.status(404).send('Process Not Found');
        return;
    }
    await process.callCleanup();
    await process.delete();
    // process.cleanup();
    res.send('Deleted');
});

app.get('/api/v1/videos/:id/transcode', async (req, res) => {
    const process = processes.find(x => x.id == req.params.id);
    if (process == null) {
        res.status(404).send('Process Not Found');
        return;
    }
    if (process.getState() != 'RECORDING') {
        res.status(404).send('Process Not in state recording');
        return;
    }
    await process.callCleanup();
    res.send('Transcoded');
});

app.get('/api/v1/streamers/image/:id', async (req, res) => {
    const process = processes.find(x => x.id == req.params.id);
    if (process == null) {
        res.status(404).send('Process Not Found');
        return;
    }

    const imageFilePath = process.imageFilePath;
    if (imageFilePath == null) {
        res.status(404).send('Image Location Not Found');
        return;
    }

    res.sendFile(imageFilePath);
});

app.get('/api/v1/live/:id/hls/:filename', async (req, res) => {
    const process = processes.find(x => x.id == req.params.id);
    if (process == null) {
        res.status(404).send('Process Not Found');
        return;
    }

    const hlsFilePath = process.recordingFilePath;
    if (hlsFilePath == null) {
        res.status(404).send('HLS Location Not Found');
        return;
    }

    if (process.getState() !== 'RECORDING') {
        res.status(404).send('Process Not in state recording');
        return;
    }

    const hlsDir = path.join(hlsFilePath, '..');

    const filename = req.params.filename;

    const files = fs.readdirSync(hlsDir);
    if (!files.includes(filename)) {
        res.status(404).send('HLS File Not Found');
        return;
    }

    const result = path.join(hlsFilePath, '..', filename);

    res.sendFile(result);

});

app.get('/api/v1/sniffEntrys', async (req, res) => {
    const sniffEntrys = await database.get<SniffEntry>('sniffEntries').get();
    res.json(sniffEntrys);
});

const PORT = process.env.PORT || 8081;

app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});

const commandManager = CommandManager.createCommandManager(process.stdin, process.stdout);

interface SniffEntry {
    twitchStreamerName: string;
    everyxMinute: number;
    userUUID: string;
    lastCheck: number;
}

const processes = [] as RecordEntry[];

const enbaleSniffEntries = false;

let lastCheck = Date.now();
main();
async function main() {

    let counter = 0;
    commandManager.registerCommand(new Command(['list', 'l'], 'list', 'Lists currently waiting / active streams', async (command, [...args], scope) => {
        console.log(processes.map(x => x.metas));

        const sniffEntrys = await database.get<SniffEntry>('sniffEntries').get();

        return [
            'Record List:',
            `  - Last Check: ${formatNumPrec((Date.now() - lastCheck) / 1000, 1)}s`,
            '',
            ...sniffEntrys.map(x => `  ${x.twitchStreamerName} => Waiting (every ${x.everyxMinute} minute${x.everyxMinute > 1 ? 's' : ''})`),
            '',
            ...processes.map(x => `  ${x.twitchStreamerName} - ${x.getState()} => ${x.ffmpegMetadata?.time} - ${x.ffmpegMetadata?.speed}x - ${x.ffmpegMetadata?.bitrate} - ${bytesToHumanReadable(parseInt(x.ffmpegMetadata?.size))} from ${formatNumPrec((Date.now() - x.ffmpegMetadata?.from) / 1000, 2)}s`),
        ];
    }));

    commandManager.registerCommand(new Command(['record', 'r'], 'record <Name> <watchLive>', 'Records a new stream', async (command, [...args], scope) => {
        const streamer = args[1];
        const watchLive = args[2] ? (args[2] == '1' || args[2] == 'true') : false;
        console.log('Recording:', streamer, ' with watchLive Flag:', watchLive);
        const entry = new RecordEntry('JODU', streamer, watchLive);
        await entry.record();
        processes.push(entry);
        entry.onRecordingFinished(() => {
            console.log('Recording Finished for', entry);
            // processes.splice(processes.findIndex(e => e.id == entry.id), 1);
        });
        return '';
    }));

    commandManager.registerCommand(new Command(['transcode', 't'], 'transcode <ID>', 'Starts the transcoding process for a given ID', async (command, [...args], scope) => {
        const id = args[1];
        const entry = processes.find(x => x.id == id);
        if (entry == null) {
            return 'Entry not found';
        }
        if (entry.getState() !== 'RECORDING') {
            return 'Entry is not in state recording';
        }

        await entry.callCleanup();

        return 'Started Transcoding for ' + id;
    }));


    const tmpDir = path.join(__dirname, '..', 'TMP');


    const stats = fs.statfsSync(tmpDir);
    const gbFree = (stats.bsize * stats.bavail) / 1024 / 1024 / 1024;
    console.log('Free Disk Space: ', gbFree, 'GB');




    // Interval for process heartbeat + sniffEntry Check
    setInterval(async () => {
        counter++;

        await Promise.all(processes.filter(x => x.getState() == 'RECORDING').map(process => process.heartbeat()));

        const sniffEntrys = await database.get<SniffEntry>('sniffEntries').get();
        for (const sniffEntry of sniffEntrys) {
            if (counter % sniffEntry.everyxMinute != 0)
                continue;

            await database.get<SniffEntry>('sniffEntries').update({ twitchStreamerName: sniffEntry.twitchStreamerName, userUUID: sniffEntry.userUUID }, {
                lastCheck: Date.now()
            });
            if (enbaleSniffEntries) {
                if (!await isLive(sniffEntry.twitchStreamerName)) {
                    console.log('Stream', sniffEntry.twitchStreamerName, 'is not live!');
                    continue;
                }
                const entry = new RecordEntry(sniffEntry.userUUID, sniffEntry.twitchStreamerName);
                await entry.record();
                processes.push(entry);
                entry.onRecordingFinished(() => {
                    console.log('Recording Finished for', entry);
                    // processes.splice(processes.findIndex(e => e.id == entry.id), 1);
                });
            }
        }

        if (counter >= Number.MAX_SAFE_INTEGER - 55)
            counter = 0;

        lastCheck = Date.now();

    }, 1000 * 60);

    // Interval for Process Screenshots
    setInterval(async () => {
        await Promise.all(processes.filter(x => x.getState() == 'RECORDING').map(process => process.captureScreenshot()));
    }, 1000 * 30);

    // Timeout for Hardcoded Recordings for testing
    setTimeout(async () => {
        console.log('Starting Hardcoded Recording');
        // {
        //     const entry = new RecordEntry('JODU', 'xchocobars', true);
        //     await entry.record();
        //     processes.push(entry);
        //     entry.onRecordingFinished(() => {
        //         console.log('Recording Finished for', entry);
        //         processes.splice(processes.findIndex(e => e.id == entry.id), 1);
        //     });
        // }
        {
            const streamer = 'jinnytty';
            if (!await isLive(streamer)) {
                console.log('Stream', streamer, 'is not live!');
                return;
            }
            const entry = new RecordEntry('JODU', streamer, true);
            await entry.record();
            processes.push(entry);
            entry.onRecordingFinished(() => {
                console.log('Recording Finished for', entry);
                // processes.splice(processes.findIndex(e => e.id == entry.id), 1);
            });
        }
    }, 1000);

}

process.on('uncaughtException', (err) => {
    console.log('Uncaught Exception:', err);
});

process.on('unhandledRejection', (err) => {
    console.log('Unhandled Rejection:', err);
});