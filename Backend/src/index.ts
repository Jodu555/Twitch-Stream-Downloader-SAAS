import { Command, CommandManager } from '@jodu555/commandmanager';
import cors from 'cors';
import express, { NextFunction, Request, Response } from 'express';
import fs from 'fs';
import morgan from 'morgan';
import path from 'path';
import dotenv from 'dotenv';
import http from 'http';
import { Server, Socket } from 'socket.io';
dotenv.config();

import { Database } from '@jodu555/mysqlapi';
const database = Database.createDatabase(process.env.DB_HOST, process.env.DB_USERNAME, process.env.DB_PASSWORD, process.env.DB_DATABASE);
database.connect({
    charset: 'utf8mb4_unicode_ci',
});
import { setupTables } from './utils/database';
setupTables();

import RecordEntry, { MetaRepresent, RecordEntryState, VideoMeta } from './RecordEntry';
import { formatNumPrec, bytesToHumanReadable } from './utils';
import { isLive } from './streamLinkHelpers';
import { router as paypalRouter } from './router/paypal';
import { PermissionError } from './utils/permissions';
import { router as automationsRouter } from './router/automations';
import { AuthenticatedRequest, authentication, router as authRouter, getUser } from './router/auth';
import { router as recordsRouter } from './router/records';
import { router as cronRouter } from './router/cron';
import { router as youtubeRouter } from './router/youtube';
import { Account, Automation, DatabaseInvoice, DatabaseRecordEntry } from './utils/types';
import EmailManager from './EmailManager';
import { z } from 'zod';

const app = express();

app.use(express.json());

app.use(morgan('dev'));
app.use(cors());

app.use(paypalRouter);
app.use(automationsRouter);
app.use(authRouter);
app.use(recordsRouter);
app.use(cronRouter);
app.use(youtubeRouter);
const server = http.createServer(app);

interface ServerToClientEvents {
    noArg: () => void;
    basicEmit: (a: number, b: string, c: Buffer) => void;
    withAck: (d: string, callback: (e: number) => void) => void;

    recordingUpdate: (d: { ID: string, data: Partial<RecordEntry>; }) => void;

    automationUpdate: (d: { ID: string; data: Automation; }) => void;
    automationDeletion: (d: { ID: string; }) => void;

    videoUpdate: (d: { ID: string, data: Partial<RecordEntry>; }) => void;
    videoDeletion: (d: { ID: string; }) => void;
}

interface ClientToServerEvents {
    hello: () => void;
}

interface InterServerEvents {
    ping: () => void;
}

interface SocketClientData {
    type: 'client';
    token: string;
    user: Account;
}

type SocketData = SocketClientData;


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

export const emailManager = new EmailManager();

// const mainRouter = express.Router();
// app.use('/api/v1', mainRouter);

io.use(async (socket, next) => {
    const type = socket.handshake.auth.type;
    if (type === 'client') {
        const authToken = socket.handshake.auth.token;
        const user = await getUser(authToken);
        if (authToken && user) {
            console.log(`Socket with`);
            console.log(`   ID: ${socket.id} - ${type.toUpperCase()}`);
            console.log(`   - proposed with: ${authToken} - ${user.email}`);
            socket.data = { token: authToken, user: user, type };
            return next();
        } else {
            next(new Error('Authentication error'));
        }
        // return next();
    }
    // if (type === 'rmvc-emitter') {
    //     // socket.auth = { type };
    //     return next();
    // }
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
        console.log(`   ID: ${socket.id} - ${socket.data.user.email}`);
        console.log(`   - disconnected`);

        // await sendSocketAdminUpdate();
    });
});

app.get('/api/v1/invoices', authentication(), async (req: AuthenticatedRequest, res) => {
    const userUUID = req.credentials.user.UUID;
    res.json(await database.get<DatabaseInvoice>('invoices').get({ userUUID }));
});

app.get('/api/v1/video/:id', authentication(), async (req: AuthenticatedRequest, res, next) => {
    try {
        const { id } = z.object({ id: z.string() }).parse(req.params);

        const userUUID = req.credentials.user.UUID;

        const video = processes.find(x => x.id == id && x.userUUID == userUUID);

        if (video == null) {
            res.status(404).send('Video not found');
            return;
        }

        if (video.getState() !== 'FINISHED') {
            res.status(404).send('Video not finished');
            return;
        }

        if (fs.existsSync(video.outputFilePath) === false) {
            res.status(404).send('Video not found on disk');
            return;
        }

        res.sendFile(video.outputFilePath);

    } catch (error) {
        console.log('Error:', error);
        next(error);
    }
});

app.get('/api/v1/videos', authentication(), async (req: AuthenticatedRequest, res) => {
    const userUUID = req.credentials.user.UUID;
    res.json(processes.filter(x => x.userUUID == userUUID).filter(x => x.getState() == 'FINISHED').map(x => x.toFrontend()));
});

app.delete('/api/v1/videos/:id', authentication(), async (req: AuthenticatedRequest, res) => {
    const userUUID = req.credentials.user.UUID;
    const parse = z.object({
        id: z.string(),
    });
    const reqData = parse.parse(req.params);
    const process = processes.filter(x => x.userUUID == userUUID).find(x => x.id == reqData.id);
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

app.get('/api/v1/streamers/image/:id', authentication(), async (req: AuthenticatedRequest, res) => {
    const userUUID = req.credentials.user.UUID;
    const parse = z.object({
        id: z.string(),
    });
    const reqData = parse.parse(req.params);
    const process = processes.filter(x => x.userUUID == userUUID).find(x => x.id == reqData.id);

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

app.get('/api/v1/live/:id/hls/:filename', authentication(), async (req: AuthenticatedRequest, res) => {
    const userUUID = req.credentials.user.UUID;
    const parse = z.object({
        id: z.string(),
        filename: z.string(),
    });
    const reqData = parse.parse(req.params);
    const process = processes.filter(x => x.userUUID == userUUID).find(x => x.id == reqData.id);
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

app.get('/api/v1/debug/mail/:type', async (req, res) => {
    // 'VERIFICATION' | 'INVOICE_OPENED' | 'INVOICE_DUE' | 'DISCOUNT' | 'VIDEO_ABT_DELETED' | 'RECORDING_AUTO_STARTED' | 'RECORDING_AUTO_ENDED'
    const parse = z.object({
        type: z.enum(['VERIFICATION', 'INVOICE_OPENED', 'INVOICE_DUE', 'DISCOUNT', 'VIDEO_ABT_DELETED', 'RECORDING_AUTO_STARTED', 'RECORDING_AUTO_ENDED']),
    });
    const { type } = parse.parse(req.params);

    const data = await emailManager.getEmailData(type, req.query as any);

    console.log(data.subject);
    res.send(data.html);
});

app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    const error = {
        message: err.stack?.split('\n')[0],
        stack: err.stack,
    };
    let status = 500;
    // if (err instanceof AuthenticationError) status = 401;

    if (err instanceof z.ZodError) {
        status = 400;
        error.message = err.errors.map(x => x.message).join(', ');
        error.stack = err.errors.map(x => x.path.join('.')).join(', ');
    }

    if (err instanceof PermissionError) {
        status = 403;
        console.log('Permission Error:', err.message);
        error.message = err.message;
        error.stack = err.stack;
    }

    try {
        const { Database } = require('@jodu555/mysqlapi');
        const database = Database.getDatabase();
        if (err instanceof database.ParsingError) status = 422;
    } catch (error) { }

    if (process.env.NODE_ENV !== 'production') {
        if (error.message?.includes('notFound')) {
            res.status(404).send({
                success: false,
                path: req.path,
                message: 'Route not Found!',
            });
        } else {
            res.status(status).send({
                success: false,
                method: req.method,
                path: req.path,
                error,
            });
        }
    } else {
        res.status(status).send({
            success: false,
            message: error.message,
        });
    }
});

const PORT = process.env.PORT || 8081;

server.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});

const commandManager = CommandManager.createCommandManager(process.stdin, process.stdout);

export const processes = [] as RecordEntry[];

const enbaleautomations = false;

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
        const automations = await database.get<Automation>('automations').get();

        const finished = processes.filter(x => x.getState() != 'RECORDING' && x.getState() != 'TRANSCODING');
        const recording = processes.filter(x => x.getState() == 'RECORDING' || x.getState() == 'TRANSCODING');

        return [
            'Record List:',
            `  - Last Check: ${formatNumPrec((Date.now() - lastCheck) / 1000, 1)}s`,
            '',
            'Sniff Entrys:',
            ...automations.map(x => `  ${x.twitchStreamerName} => Waiting (every ${x.everyxMinute} minute${x.everyxMinute > 1 ? 's' : ''})`),
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
        const entry = new RecordEntry('JODU', streamer, undefined, watchLive);
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
            console.log(`Deleted ${record.id} from ${record.twitchStreamerName} with ${record.metas.length} Title/s and ${record.videoMeta?.time} - ${bytesToHumanReadable(parseInt(record.videoMeta?.size))} timestamp ${new Date(record.finishedAt).toLocaleString('de')}`);
        }
        return '';
    }));

    commandManager.registerCommand(new Command(['socketsessions', 'ss'], 'ss', 'Lists all currently connected sockets', async (command, [...args], scope) => {


        const sockets = await io.fetchSockets();
        return sockets.map(x => {
            return `${x.id} - ${x.handshake.auth.type} - ${x.handshake.auth.token} - ${x.data.user.email}`;
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

        const automations = await database.get<Automation>('automations').get();
        for (const automation of automations) {
            if (counter % automation.everyxMinute != 0)
                continue;

            automation.lastCheck = Date.now();
            await database.get<Automation>('automations').update({ ID: automation.ID, userUUID: automation.userUUID, unique: true }, {
                lastCheck: automation.lastCheck
            });

            (await io.fetchSockets()).filter(x => x.data.user.UUID == automation.userUUID).forEach(x => x.emit('automationUpdate', { ID: automation.ID, data: automation }));

            if (enbaleautomations) {
                if (!await isLive(automation.twitchStreamerName)) {
                    console.log('Stream', automation.twitchStreamerName, 'is not live!');
                    continue;
                }
                if (processes.find(x => x.automationUUID == automation.ID && x.userUUID == automation.userUUID)) {
                    console.log('Process already exists for', automation.userUUID, 'and', automation.twitchStreamerName);
                    continue;
                }
                const entry = new RecordEntry(automation.userUUID, automation.twitchStreamerName, automation.ID, false);
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

}

process.on('uncaughtException', (err) => {
    console.log('Uncaught Exception:', err);
});

process.on('unhandledRejection', (err) => {
    console.log('Unhandled Rejection:', err);
});