import { Router } from 'express';
import { Database } from '@jodu555/mysqlapi';
import { SniffEntry } from 'src/utils/types';
import { io } from '..';
import { AuthenticatedRequest, authentication } from './auth';
import { z } from 'zod';

const database = Database.getDatabase();

export const router = Router();

router.get('/api/v1/sniffEntrys', authentication(), async (req: AuthenticatedRequest, res) => {
    const userUUID = req.credentials.user.UUID;
    const sniffEntrys = await database.get<SniffEntry>('sniffEntries').get({ userUUID });
    res.json(sniffEntrys);
});

router.post('/api/v1/sniffEntrys', authentication(), async (req: AuthenticatedRequest, res) => {
    const userUUID = req.credentials.user.UUID;

    //TODO: Check if user is allowed to add entry

    const parse = z.object({
        twitchStreamerName: z.string(),
    });
    const reqData = parse.parse(req.params);

    const twitchStreamerName = reqData.twitchStreamerName;
    const entry = {
        everyxMinute: 1,
        lastCheck: Date.now() - 1000 * 60,
        twitchStreamerName: twitchStreamerName,
        userUUID: userUUID,
    } satisfies SniffEntry;
    await database.get<SniffEntry>('sniffEntries').create(entry);
    (await io.fetchSockets()).filter(x => x.data.user.UUID == userUUID).forEach(x => x.emit('automationUpdate', { streamer: twitchStreamerName, data: entry }));

    res.send('Created');
});

router.delete('/api/v1/sniffEntrys/:name', authentication(), async (req: AuthenticatedRequest, res) => {
    const userUUID = req.credentials.user.UUID;
    const parse = z.object({
        name: z.string(),
    });
    const reqData = parse.parse(req.params);
    const twitchStreamerName = reqData.name;
    await database.get<SniffEntry>('sniffEntries').delete({ userUUID, twitchStreamerName: twitchStreamerName });
    (await io.fetchSockets()).filter(x => x.data.user.UUID == userUUID).forEach(s => s.emit('automationDeletion', { streamer: twitchStreamerName }));
    res.send('Deleted');
});
