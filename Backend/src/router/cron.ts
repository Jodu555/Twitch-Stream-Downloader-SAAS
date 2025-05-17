import crypto from 'crypto';
import { Router, Request, Response, NextFunction } from 'express';
import { Database } from '@jodu555/mysqlapi';
import { z } from 'zod';
import { Account, DatabaseInvoice } from '../utils/types';
import { getUserLimitByAccount } from '../utils/permissions';
import { emailManager, processes } from '..';
import { priceMap, resetAccountToTier } from './auth';

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
        }

        const toDays = (days: number) => days * 24 * 60 * 60 * 1000;

        const userMap = new Map<string, Account>();

        for (const entry of processes) {
            if (entry.getState() == 'FINISHED') {
                const user = await getUser(userMap, entry.userUUID);
                const deletionAt = entry.finishedAt + toDays(await getUserLimitByAccount(user, 'videoRetentionDays'));

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


            //The Last renewed date is the date the user last renewed their subscription
            //If the user has not renewed their subscription in 25 days, send them an email that their subscription is about to expire in 5 days
            const invoices = await database.get<DatabaseInvoice>('invoices').get({ userUUID: account.UUID, status: 'UNPAID' });
            if (account.last_renewed + toDays(25) <= Date.now() && invoices.length == 0) {
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
                emailManager.sendEmail(account.UUID, 'INVOICE_OPENED', undefined);
            }

            if (account.last_renewed + toDays(30) <= Date.now() && invoices.length > 0) {
                emailManager.sendEmail(account.UUID, 'INVOICE_DUE', undefined);
            }

            if (account.last_renewed + toDays(35) <= Date.now() && invoices.length > 0) {
                resetAccountToTier(account.UUID, 'FREE');
            }



        }



    } catch (error) {
        next(error);
    }
});