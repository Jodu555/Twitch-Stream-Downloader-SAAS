import crypto from 'crypto';
import { Router, Request, Response, NextFunction } from 'express';
import { Database } from '@jodu555/mysqlapi';
import { z } from 'zod';
import { Account, DatabaseInvoice } from '../utils/types';
import { getUserLimitByAccount } from '../utils/permissions';
import { emailManager, processes } from '..';
import { priceMap, resetAccountToTier } from './auth';
import { checkAndSendNotificationAccount } from '../utils/notifications';

const database = Database.getDatabase();

export const router = Router();

async function getUser(userMap: Map<string, Account>, userUUID: string) {
    if (!userMap.has(userUUID)) {
        const user = await database.get<Account>('accounts').getOne({ UUID: userUUID });
        if (user) {
            userMap.set(userUUID, user);
        }
    }

    const user = userMap.get(userUUID);
    return user;
}

router.get('/api/v1/cron/', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { cronToken } = z.object({
            cronToken: z.string()
        }).parse(req.query);
        if (cronToken !== process.env.CRON_TOKEN) {
            res.status(401).send('Invalid Cron Token');
            return;
        }

        const toDays = (days: number) => days * 24 * 60 * 60 * 1000;

        const userMap = new Map<string, Account>();

        for (const entry of processes) {
            if (entry.getState() == 'FINISHED') {
                const user = await getUser(userMap, entry.userUUID);
                const deletionAt = entry.finishedAt + toDays(await getUserLimitByAccount(user, 'videoRetentionDays'));

                if (deletionAt + toDays(2) < Date.now() || deletionAt + toDays(1) < Date.now()) {
                    await checkAndSendNotificationAccount(user, 'videoDeletion', {
                        videoName: entry.twitchStreamerName,
                        deleteDate: deletionAt,
                    });
                }

                if (deletionAt < Date.now()) {
                    await entry.delete();
                }
            }
            if (entry.getState() == 'DELETED') {
                const user = await getUser(userMap, entry.userUUID);
                //TODO: Actually delete the video from the server / disk
            }
        }

        // const accountsVerifyPending = await database.get<Account>('accounts').get({ status: 'EMAIL_VERIFY_PENDING' });
        // for (const account of accountsVerifyPending) {
        //     const daysNoEmailVerify = 2;
        //     if (account.created_at + toDays(daysNoEmailVerify) < Date.now()) {
        //         // await database.get<Account>('accounts').delete({ UUID: account.UUID });
        //         // await database.get('emails').delete({ userUUID: account.UUID, email_type: 'VERIFICATION' });
        //         //TODO: Delete the user from the server / disk with emails automations recordEntries etc
        //     }
        // }

        const accounts = await database.get<Account>('accounts').get({ status: 'VERIFIED' });
        for (const account of accounts) {
            if (account.subscription_type == 'FREE') continue;

            //The Last renewed date is the date the user last renewed their subscription
            //If the user has not renewed their subscription in 25 days, send them an email that their subscription is about to expire in 5 days
            const invoices = await database.get<DatabaseInvoice>('invoices').get({ userUUID: account.UUID, status: 'UNPAID' });
            if (account.last_renewed + toDays(25) <= Date.now() && invoices.length == 0) {

                if (account.pendingDowngrade) {
                    await database.get<Account>('accounts').update({ UUID: account.UUID }, { pendingDowngrade: undefined });
                    // await database.get<Account>('accounts').update({ UUID: account.UUID }, { subscription_type: account.pendingDowngrade, pendingDowngrade: undefined });
                    if (account.pendingDowngrade == 'FREE') {
                        continue;
                    }
                    account.pendingDowngrade = undefined;
                    account.subscription_type = account.pendingDowngrade;
                }


                //Create a new invoice for the user
                const invoice = {
                    ID: crypto.randomUUID(),
                    userUUID: account.UUID,
                    amount: priceMap[account.subscription_type],
                    status: 'UNPAID',
                    action: 'setRank:' + account.subscription_type,
                    createdAt: Date.now(),
                } satisfies DatabaseInvoice;
                await database.get<DatabaseInvoice>('invoices').create(invoice);
                await checkAndSendNotificationAccount(account, 'invoiceOpened', {
                    invoiceID: invoices[0].ID
                });
            }

            if (account.last_renewed + toDays(30) <= Date.now() && invoices.length > 0) {
                await checkAndSendNotificationAccount(account, 'invoiceDue', {
                    invoiceID: invoices[0].ID
                });
            }

            if (account.last_renewed + toDays(35) <= Date.now() && invoices.length > 0) {
                resetAccountToTier(account.UUID, 'FREE');
            }
        }
    } catch (error) {
        next(error);
    }
});