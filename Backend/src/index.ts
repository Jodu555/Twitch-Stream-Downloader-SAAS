import { Command, CommandManager } from '@jodu555/commandmanager';
import cors from 'cors';
import express from 'express';
import fs from 'fs';
import morgan from 'morgan';
import path from 'path';
import dotenv from 'dotenv';
import http from 'http';
import { Server, Socket } from 'socket.io';
dotenv.config();

import { Database } from '@jodu555/mysqlapi';
const database = Database.createDatabase(process.env.DB_HOST, 'twitcher', process.env.DB_PASSWORD, 'twitch-stream-downloader');
database.connect({
    charset: 'utf8mb4_unicode_ci',
});
import { setupTables } from './utils/database';
setupTables();

import RecordEntry, { MetaRepresent, RecordEntryState, VideoMeta } from './RecordEntry';
import { formatNumPrec, bytesToHumanReadable } from './utils';
import { isLive } from './streamLinkHelpers';
import { router as paypalRouter } from './router/paypal';
import { router as sniffEntriesRouter } from './router/sniffEntries';
import { DatabaseInvoice, DatabaseRecordEntry, SniffEntry } from './utils/types';

const app = express();

app.use(express.json());

// app.use(morgan('dev'));
app.use(cors());

app.use(paypalRouter);
app.use(sniffEntriesRouter);

const server = http.createServer(app);

interface ServerToClientEvents {
    noArg: () => void;
    basicEmit: (a: number, b: string, c: Buffer) => void;
    withAck: (d: string, callback: (e: number) => void) => void;
    recordingUpdate: (d: { ID: string, data: Partial<RecordEntry>; }) => void;
    monitoringUpdate: (d: { streamer: string, data: SniffEntry; }) => void;
}

interface ClientToServerEvents {
    hello: () => void;
}

interface InterServerEvents {
    ping: () => void;
}

interface SocketData {
    name: string;
    age: number;
}

export const io = new Server<
    ClientToServerEvents,
    ServerToClientEvents,
    InterServerEvents,
    SocketData
>(server, {
    cors: {
        methods: ['GET', 'POST'],
    },
});

io.use(async (socket, next) => {
    const type = socket.handshake.auth.type;
    if (type === 'client') {
        const authToken = socket.handshake.auth.token;
        socket.data.name = 'TESTNAME';
        console.log(`Socket with`);
        console.log(`   ID: ${socket.id} - ${type.toUpperCase()}`);
        console.log(`   - proposed with: ${authToken} - ${socket.data.name}`);

        // if (authToken && (await authHelper.getUser(authToken))) {
        //     console.log(`Socket with`);
        //     console.log(`   ID: ${socket.id} - ${type.toUpperCase()}`);
        //     console.log(`   - proposed with: ${authToken} - ${(await authHelper.getUser(authToken)).username}`);
        //     socket.auth = { token: authToken, user: await authHelper.getUser(authToken), type };
        //     return next();
        // } else {
        //     next(new Error('Authentication error'));
        // }
        return next();
    }
    if (type === 'rmvc-emitter') {
        // socket.auth = { type };
        return next();
    }
});

io.on('connection', async (socket) => {
    const auth = socket.handshake.auth;

    // if (auth.type == 'client') {
    //     socketInitClient(socket);
    //     socketInitSync(socket);
    //     socketInitRMVCEmitter(socket);
    // }
    // if (auth.type == 'rmvc-emitter') socketInitRMVCEmitter(socket);
    // if (auth.type == 'scraper') socketInitScraper(socket);
    // if (auth.type == 'sub') socketInitSub(socket);

    // await sendSocketAdminUpdate();

    socket.on('disconnect', async () => {
        console.log(`Socket with`);
        console.log(`   ID: ${socket.id} - ${socket.data.name}`);
        console.log(`   - disconnected`);

        // await sendSocketAdminUpdate();
    });
});

app.get('/api/v1/invoices', async (req, res) => {
    res.json(await database.get<DatabaseInvoice>('invoices').get());
});

app.get('/api/v1/streamers', async (req, res) => {
    res.json(processes.filter(x => x.getState() == 'RECORDING' || x.getState() == 'TRANSCODING').map(x => x.toFrontend()));
});

app.get('/api/v1/videos', async (req, res) => {
    res.json(processes.filter(x => x.getState() == 'FINISHED').map(x => x.toFrontend()));
});

app.get('/api/v1/streamers/record/:name/:watchLive?', async (req, res) => {
    const twitchUsername = req.params.name;
    const watchLive = req.params.watchLive == 'true';
    const entry = new RecordEntry('JODU', twitchUsername, watchLive);
    await entry.record();
    processes.push(entry);
    entry.onRecordingFinished(() => {
        console.log('Recording Finished for', entry.toFrontend());
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
    if (process.getState() !== 'FINISHED') {
        await process.callCleanup();
    }
    await process.delete();
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

const PORT = process.env.PORT || 8081;

server.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});

const commandManager = CommandManager.createCommandManager(process.stdin, process.stdout);

const processes = [] as RecordEntry[];

const enbaleSniffEntries = false;

let lastCheck = Date.now();
main();
async function main() {

    console.log('Backfilling Records');

    const entries = await database.get<DatabaseRecordEntry>('recordEntries').get();

    for (const entry of entries) {
        const record = RecordEntry.fromDatabase(entry);
        processes.push(record);
    }

    console.log('Backfilled', entries.length, 'Record/s');


    let counter = 0;
    commandManager.registerCommand(new Command(['list', 'l'], 'list', 'Lists currently waiting / active streams', async (command, [...args], scope) => {
        const sniffEntrys = await database.get<SniffEntry>('sniffEntries').get();

        const finished = processes.filter(x => x.getState() != 'RECORDING' && x.getState() != 'TRANSCODING');
        const recording = processes.filter(x => x.getState() == 'RECORDING' || x.getState() == 'TRANSCODING');

        return [
            'Record List:',
            `  - Last Check: ${formatNumPrec((Date.now() - lastCheck) / 1000, 1)}s`,
            '',
            'Sniff Entrys:',
            ...sniffEntrys.map(x => `  ${x.twitchStreamerName} => Waiting (every ${x.everyxMinute} minute${x.everyxMinute > 1 ? 's' : ''})`),
            '',
            'Finished:',
            ...finished.map(x => `  ${x.twitchStreamerName} - ${x.getState()} => ${x.videoMeta?.time} - ${bytesToHumanReadable(parseInt(x.videoMeta?.size))} from ${new Date(x.finishedAt).toLocaleString('de')} with ${x.metas.length} Title/s`),
            '',
            'Recording:',
            ...recording.map(x => `  ${x.twitchStreamerName} - ${x.getState()} => ${x.ffmpegMetadata?.time} - ${x.ffmpegMetadata?.speed}x - ${x.ffmpegMetadata?.bitrate} - ${bytesToHumanReadable(parseInt(x.ffmpegMetadata?.size))} from ${formatNumPrec((Date.now() - x.ffmpegMetadata?.from) / 1000, 2)}s`),
            '',
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
            console.log('Recording Finished for', entry.toFrontend());
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

    commandManager.registerCommand(new Command(['processDeleted', 'pDe'], 'processDeleted', 'Processes all Processes marked as deleted and removes them from disk', async (command, [...args], scope) => {
        const records = processes.filter(x => x.getState() == 'DELETED');
        for (const record of records) {
            fs.rmSync(record.outputFilePath, { force: true });
            await database.get<DatabaseRecordEntry>('recordEntries').delete({ ID: record.id });
            processes.splice(processes.findIndex(x => x.id == record.id), 1);
            console.log('Deleted', record.toFrontend());
        }
        return '';
    }));

    commandManager.registerCommand(new Command(['socketsessions', 'ss'], 'ss', 'Lists all currently connected sockets', async (command, [...args], scope) => {


        const sockets = await io.fetchSockets();
        return sockets.map(x => {
            return `${x.id} - ${x.handshake.auth.type} - ${x.handshake.auth.token} - ${x.data.name}`;
        });;
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

            sniffEntry.lastCheck = Date.now();
            await database.get<SniffEntry>('sniffEntries').update({ twitchStreamerName: sniffEntry.twitchStreamerName, userUUID: sniffEntry.userUUID }, {
                lastCheck: sniffEntry.lastCheck
            });

            (await io.fetchSockets()).forEach(x => x.emit('monitoringUpdate', { streamer: sniffEntry.twitchStreamerName, data: sniffEntry }));

            if (enbaleSniffEntries) {
                if (!await isLive(sniffEntry.twitchStreamerName)) {
                    console.log('Stream', sniffEntry.twitchStreamerName, 'is not live!');
                    continue;
                }
                if (processes.find(x => x.userUUID == sniffEntry.userUUID && x.twitchStreamerName == sniffEntry.twitchStreamerName)) {
                    console.log('Process already exists for', sniffEntry.twitchStreamerName);
                    continue;
                }
                const entry = new RecordEntry(sniffEntry.userUUID, sniffEntry.twitchStreamerName, false);
                await entry.record();
                processes.push(entry);
                entry.onRecordingFinished(() => {
                    console.log('Recording Finished for', entry.toFrontend());
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
        //         console.log('Recording Finished for', entry.toFrontend());
        //         processes.splice(processes.findIndex(e => e.id == entry.id), 1);
        //     });
        // }
        // {
        //     const streamer = 'jinnytty';
        //     if (!await isLive(streamer)) {
        //         console.log('Stream', streamer, 'is not live!');
        //         return;
        //     }
        //     const entry = new RecordEntry('JODU', streamer, true);
        //     await entry.record();
        //     processes.push(entry);
        //     entry.onRecordingFinished(() => {
        //         console.log('Recording Finished for', entry.toFrontend());
        //         // processes.splice(processes.findIndex(e => e.id == entry.id), 1);
        //     });
        // }
    }, 1000);

}

process.on('uncaughtException', (err) => {
    console.log('Uncaught Exception:', err);
});

process.on('unhandledRejection', (err) => {
    console.log('Unhandled Rejection:', err);
});