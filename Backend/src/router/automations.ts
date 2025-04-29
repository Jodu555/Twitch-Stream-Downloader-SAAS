import { Router } from 'express';
import { Database } from '@jodu555/mysqlapi';
import { Automation } from 'src/utils/types';
import { io } from '..';
import { AuthenticatedRequest, authentication } from './auth';
import { z } from 'zod';

const database = Database.getDatabase();

export const router = Router();

router.get('/api/v1/automations', authentication(), async (req: AuthenticatedRequest, res, next) => {
    try {
        const userUUID = req.credentials.user.UUID;
        const automations = await database.get<Automation>('automations').get({ userUUID });
        res.json(automations);
    } catch (error) {
        next(error);
    }
});

router.post('/api/v1/automations', authentication(), async (req: AuthenticatedRequest, res, next) => {
    try {
        const userUUID = req.credentials.user.UUID;

        //TODO: Check if user is allowed to add entry

        const parse = z.object({
            twitchStreamerName: z.string(),
            linkedAccountUUID: z.string().uuid().optional(),
        });
        const reqData = parse.parse(req.body);

        if (reqData.linkedAccountUUID) {
            //TODO: Check if uuid exists and yada yada
        }

        const twitchStreamerName = reqData.twitchStreamerName;
        const entry = {
            ID: crypto.randomUUID(),
            everyxMinute: 1,
            lastCheck: Date.now() - 1000 * 60,
            twitchStreamerName: twitchStreamerName,
            userUUID: userUUID,
        } satisfies Automation;
        await database.get<Automation>('automations').create(entry);
        (await io.fetchSockets()).filter(x => x.data.user.UUID == userUUID).forEach(x => x.emit('automationUpdate', { ID: entry.ID, data: entry }));

        res.send('Created');
    } catch (error) {
        next(error);
    }
});

router.delete('/api/v1/automations/:ID', authentication(), async (req: AuthenticatedRequest, res, next) => {
    try {
        const userUUID = req.credentials.user.UUID;
        const parse = z.object({
            ID: z.string().uuid(),
        });
        const reqData = parse.parse(req.params);
        await database.get<Automation>('automations').delete({ ID: reqData.ID, userUUID, unique: true });
        (await io.fetchSockets()).filter(x => x.data.user.UUID == userUUID).forEach(s => s.emit('automationDeletion', { ID: reqData.ID }));
        res.send('Deleted');
    } catch (error) {
        next(error);
    }
});
