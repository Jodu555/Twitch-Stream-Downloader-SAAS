import { Router } from 'express';
import { Database } from '@jodu555/mysqlapi';
import { SniffEntry } from 'src/utils/types';

const database = Database.getDatabase();

export const router = Router();

router.get('/api/v1/sniffEntrys', async (req, res) => {
    const sniffEntrys = await database.get<SniffEntry>('sniffEntries').get();
    res.json(sniffEntrys);
});

router.post('/api/v1/sniffEntrys', async (req, res) => {
    const twitchStreamerName = req.body.twitchStreamerName;
    if (twitchStreamerName == null || typeof twitchStreamerName != 'string' || twitchStreamerName.trim().length == 0) {
        res.status(400).send('twitchStreamerName is required');
        return;
    }
    await database.get<SniffEntry>('sniffEntries').create({
        everyxMinute: 1,
        lastCheck: Date.now() - 1000 * 60,
        twitchStreamerName: twitchStreamerName,
        userUUID: 'JODU',
    });
    res.send('Created');
});

router.delete('/api/v1/sniffEntrys/:name', async (req, res) => {
    const twitchStreamerName = req.params.name;
    if (twitchStreamerName == null || typeof twitchStreamerName != 'string' || twitchStreamerName.trim().length == 0) {
        res.status(400).send('twitchStreamerName is required');
        return;
    }
    await database.get<SniffEntry>('sniffEntries').delete({ twitchStreamerName: twitchStreamerName });
    res.send('Deleted');
});
