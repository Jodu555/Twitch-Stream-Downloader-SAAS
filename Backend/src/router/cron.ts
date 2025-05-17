import e, { Router, Request, Response, NextFunction } from 'express';
import { Database } from '@jodu555/mysqlapi';
import { z } from 'zod';
import RecordEntry from '../RecordEntry';
import { Account } from '../utils/types';
import { getUserLimitByAccount } from '../utils/permissions';
import { processes } from '..';

const database = Database.getDatabase();

export const router = Router();

// -   Set old videos to be deleted and next day delete them
// -   If a user is status verification pending, and the account was created 2 days ago
//     -   Delete the account
// -   Check every user for their subscription status:
//     -   If only 5 days left create new invoice and email them and mark them as
//     -   At the day it is due send them an email that their invoice is due and in 5 days their account will be reset
//         -   send them an email that in 5 days their account will be reset
//     -   If the invoice is unpaid after the 5th day, reset the account

router.get('/api/v1/cron/', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { cronToken } = z.object({
            cronToken: z.string()
        }).parse(req.query);
        if (cronToken !== process.env.CRON_TOKEN) {
            res.status(401).send('Invalid Cron Token');
        }


        const userMap = new Map<string, Account>();

        for (const entry of processes) {
            if (entry.getState() != 'FINISHED') continue;

            if (!userMap.has(entry.userUUID)) {
                const user = await database.get<Account>('accounts').getOne({ UUID: entry.userUUID });
                if (user) {
                    userMap.set(entry.userUUID, user);
                }
            }


            const user = userMap.get(entry.userUUID);
            if (!user) continue;

            const deletionAt = entry.finishedAt + (await getUserLimitByAccount(user, 'videoRetentionDays')) * 24 * 60 * 60 * 1000;

            console.log('Video ', entry.id, 'will be deleted at', new Date(deletionAt).toLocaleString('de'));

        }

    } catch (error) {
        next(error);
    }
});