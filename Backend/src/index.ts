import { Command, CommandManager } from '@jodu555/commandmanager';
import cors from 'cors';
import express from 'express';
import fs from 'fs';
import morgan from 'morgan';
import path from 'path';
import RecordEntry from './RecordEntry';
import { formatNumPrec, bytesToHumanReadable } from './utils';
import { isLive } from './streamLinkHelpers';
import dotenv from 'dotenv';
dotenv.config();

const app = express();

app.use(express.json());

app.use(morgan('dev'));
app.use(cors());

import { Database } from '@jodu555/mysqlapi';
const database = Database.createDatabase(process.env.DB_HOST, 'twitcher', process.env.DB_PASSWORD, 'twitch-stream-downloader');
database.connect();

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

app.get('/api/v1/streamers', async (req, res) => {
    res.json(processes.map(x => {
        return {
            id: x.id,
            twitchStreamerName: x.twitchStreamerName,
            metas: x.metas,
            state: x.getState(),
            pid: x.pid,
            videoMeta: x.videoMeta,
            ffmpegMetadata: x.ffmpegMetadata,
            transcodingPid: x.transcodingPid,
            recordingFilePath: x.recordingFilePath,
            imageFilePath: x.imageFilePath,
            imageUrl: x.imageUrl,
        };
    }));
});

app.get('/api/v1/streamers/image/:id', async (req, res) => {
    console.log(`Searching Process: "${req.params.id}"`);


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
    console.log(`Searching Process: "${req.params.id}"`);


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

    const result = path.join(hlsFilePath, '..', req.params.filename);

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
            ...processes.map(x => `  ${x.twitchStreamerName} => ${x.ffmpegMetadata?.time} - ${x.ffmpegMetadata?.speed}x - ${x.ffmpegMetadata?.bitrate} - ${bytesToHumanReadable(parseInt(x.ffmpegMetadata?.size))} from ${formatNumPrec((Date.now() - x.ffmpegMetadata?.from) / 1000, 2)}s`),
        ];
    }));

    commandManager.registerCommand(new Command(['record', 'r'], 'record <Name>', 'Records a new stream', async (command, [...args], scope) => {
        const streamer = args[1];
        const entry = new RecordEntry('JODU', streamer);
        await entry.record();
        processes.push(entry);
        entry.onRecordingFinished(() => {
            console.log('Recording Finished for', entry);
            processes.splice(processes.findIndex(e => e.id == entry.id), 1);
        });
        return '';
    }));


    const tmpDir = path.join(__dirname, '..', 'TMP');


    const stats = fs.statfsSync(tmpDir);
    const gbFree = (stats.bsize * stats.bavail) / 1024 / 1024 / 1024;
    console.log('Free Disk Space: ', gbFree, 'GB');




    // Check every minute if there are any new streams
    setInterval(async () => {
        counter++;

        await Promise.all(processes.map(process => process.heartbeat()));

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
                    processes.splice(processes.findIndex(e => e.id == entry.id), 1);
                });
            }
        }



        if (counter >= Number.MAX_SAFE_INTEGER - 55)
            counter = 0;

        lastCheck = Date.now();

    }, 1000 * 60);

    setInterval(async () => {
        await Promise.all(processes.map(process => process.captureScreenshot()));
    }, 1000 * 30);

    // setTimeout(async () => {
    //     console.log('Starting Hardcoded Recording');
    //     const entry = new RecordEntry('JODU', 'Sintica');
    //     await entry.record();
    //     processes.push(entry);
    //     entry.onRecordingFinished(() => {
    //         console.log('Recording Finished for', entry);
    //         processes.splice(processes.findIndex(e => e.id == entry.id), 1);
    //     });
    // }, 1000);

}
