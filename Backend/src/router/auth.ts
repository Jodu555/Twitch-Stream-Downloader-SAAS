import crypto from 'crypto';
import e, { Router, Request, Response, NextFunction } from 'express';
import { Database } from '@jodu555/mysqlapi';
import { Account, AuthToken, Automation, DatabaseInvoice, NotificationSettings, SubscriptionTypes } from 'src/utils/types';
import { emailManager, io, processes } from '..';
import { z } from 'zod';
import bcrypt from "bcryptjs";
import { LIMITS } from '../utils/permissions';

const database = Database.getDatabase();

export const router = Router();

const registerLoginSchema = z.object({
    email: z.string().email().trim(),
    password: z.string().min(8).max(128).trim(),
});

const verifyRegisterSchema = z.object({
    email: z.string().email().trim(),
    verificationID: z.string().min(4).max(7).trim(),
});

export interface AuthenticatedRequest extends Request {
    credentials: {
        token: string;
        user: Account;
    };
}

router.post('/api/v1/auth/register', async (req, res, next) => {
    try {
        const registerData = registerLoginSchema.parse(req.body);

        const search = JSON.parse(JSON.stringify(registerData));

        delete search.password;
        search.unique = false;
        const result = await database.get<Account>('accounts').get({ email: registerData.email, unique: false });

        if (result.length == 0) {
            registerData.password = await bcrypt.hash(registerData.password, 8);

            const defaultNotificationSettings = {
                discountCode: false,
                videoDeletion: true,
                recordingStart: false,
                recordingFinished: false,
                openInvoice: true,
                invoiceDue: true,
            } satisfies NotificationSettings;

            const user = {
                UUID: crypto.randomUUID(),
                email: registerData.email,
                password: registerData.password,
                status: 'EMAIL_VERIFY_PENDING',
                emailVerifyCode: Math.round(Math.random() * 99999999999).toString().split('').slice(5).join(''),
                created_at: Date.now(),
                updated_at: Date.now(),
                subscription_type: 'FREE',
                overrides: '{}',
                notificationSettings: JSON.stringify(defaultNotificationSettings),
            } as Account;
            await database.get<Account>('accounts').create(user);

            emailManager.sendEmail(user.UUID, 'VERIFICATION', {
                email: user.email,
                verificationToken: user.emailVerifyCode,
            });

            delete registerData.password;
            res.json(registerData);
        } else {
            next(new Error('There is already an account with this email! Please login! Or try with another email!'));
        }
    } catch (error) {
        next(error);
    }
});

router.post('/api/v1/auth/verify', async (req, res, next) => {
    try {
        const verifyData = verifyRegisterSchema.parse(req.body);
        const user = await database.get<Account>('accounts').getOne({ email: verifyData.email, unique: true });
        if (user) {
            if (user.emailVerifyCode == verifyData.verificationID) {
                const token = crypto.randomUUID();
                await database.get<Account>('accounts').update({ UUID: user.UUID }, { last_login: Date.now(), status: 'EMAIL_VERIFIED' });

                await database.get<AuthToken>('authtokens').create({
                    TOKEN: token,
                    UUID: user.UUID,
                });
                res.json({ message: 'Successfully verified', token });
            } else {
                next(new Error('Invalid Verify Code!'));
            }
        } else {
            next(new Error('Invalid email!'));
        }
    } catch (error) {
        next(error);
    }
});

router.post('/api/v1/auth/login', async (req, res, next) => {
    try {
        const loginData = registerLoginSchema.parse(req.body);
        const user = await database.get<Account>('accounts').getOne({ email: loginData.email, unique: true });
        if (user) {
            if (await bcrypt.compare(loginData.password, user.password)) {
                const token = crypto.randomUUID();
                delete user.password;
                await database.get<Account>('accounts').update({ UUID: user.UUID }, { last_login: Date.now() });

                await database.get<AuthToken>('authtokens').create({
                    TOKEN: token,
                    UUID: user.UUID,
                });
                res.json({ token });
            } else {
                next(new Error('Invalid password!'));
            }
        } else {
            next(new Error('Invalid email!'));
        }
    } catch (error) {
        next(error);
    }
});

router.get('/api/v1/auth/logout', authentication(), async (req: AuthenticatedRequest, res, next) => {
    const token = req.credentials.token as string;
    await database.get<AuthToken>('authtokens').delete({ TOKEN: token });
    res.json({ message: 'Successfully logged out!' });
});

router.get('/api/v1/auth/info', authentication(), async (req: AuthenticatedRequest, res, next) => {
    try {
        await database.get<Account>('accounts').update({ UUID: req.credentials?.user.UUID }, { last_handshake: Date.now() });
        res.json(req.credentials.user);
    } catch (error) {
        next(error);
    }
});

const numMap: Record<SubscriptionTypes, number> = {
    FREE: 0,
    PREMIUM: 1,
    ADVANCED: 2,
};

export const priceMap: Record<SubscriptionTypes, number> = {
    FREE: 0,
    PREMIUM: 10,
    ADVANCED: 25,
};

const planEnum = z.enum(['FREE', 'PREMIUM', 'ADVANCED']);

router.get('/api/v1/auth/upgrade/:type', authentication(), async (req: AuthenticatedRequest, res, next) => {
    try {
        const type = planEnum.parse(req.params.type);

        const user = req.credentials.user;

        if (user.status == 'EMAIL_VERIFY_PENDING') {
            next(new Error('Please verify your email first!'));
            return;
        }

        if (type == 'FREE') {
            next(new Error('Cannot upgrade to a non paid plan!'));
            return;
        }

        if (user.subscription_type == type) {
            next(new Error('You are already on this plan!'));
            return;
        }

        if (numMap[type] < numMap[user.subscription_type]) {
            next(new Error('You cannot upgrade to a lower plan!'));
            return;
        }

        if (user.subscription_type == 'FREE') {
            //If User is on free plan, create an invoice for the first time and wait for payment before upgrading
            const invoice = {
                ID: crypto.randomUUID(),
                userUUID: user.UUID,
                amount: priceMap[type],
                status: 'UNPAID',
                action: 'setRank:' + type,
                createdAt: Date.now(),
            } satisfies DatabaseInvoice;

            await database.get<DatabaseInvoice>('invoices').create(invoice);
        } else {
            //If User is on a paid plan, upgrade to the new plan immediately new invoice will be generated after the current plan ends
            await database.get<Account>('accounts').update({ UUID: user.UUID }, { subscription_type: type, first_subscribed: Date.now() });
        }


        res.json(req.credentials.user);
    } catch (error) {
        next(error);
    }
});

router.get('/api/v1/auth/downgrade/:type', authentication(), async (req: AuthenticatedRequest, res, next) => {
    try {
        const type = planEnum.parse(req.params.type);

        const user = req.credentials.user;

        if (user.status == 'EMAIL_VERIFY_PENDING') {
            next(new Error('Please verify your email first!'));
            return;
        }

        if (user.subscription_type == 'FREE') {
            next(new Error('Cannot Downgrade from free!'));
            return;
        }

        if (user.subscription_type == type) {
            next(new Error('You are already on this plan!'));
            return;
        }

        if (numMap[type] > numMap[user.subscription_type]) {
            next(new Error('You cannot downgrade to a higher plan!'));
            return;
        }

        //TODO: Downgrade to type after the current plan ends

        // await database.get<Account>('accounts').update({ UUID: user.UUID }, { subscription_type: type });

        const dateToChange = new Date(user.last_renewed);

        dateToChange.setMonth(dateToChange.getMonth() + 1);

        console.log('The Rank change will be effective on', dateToChange.toLocaleString('de'));


        res.json(req.credentials.user);
    } catch (error) {
        next(error);
    }
});

export async function getUser(token: string) {
    const search = await database.get<AuthToken>('authtokens').getOne({ TOKEN: token });
    if (search) {
        const user = await database.get<Account>('accounts').getOne({ UUID: search.UUID });
        if (user) {
            delete user.password;
            return user;
        }
    }
    return undefined;
}

export function authentication() {
    return authenticationFull(() => true);
}

export function authenticationFull(cb: (user: Account) => boolean) {
    return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        const token = (req.headers['auth-token'] as string) || (req.query['auth-token'] as string);
        if (token) {
            const user = await getUser(token);
            if (user) {
                if (!cb || cb(user)) {
                    if (typeof user?.overrides == 'string') user.overrides = JSON.parse(user.overrides);
                    if (typeof user.notificationSettings == 'string') user.notificationSettings = JSON.parse(user.notificationSettings);
                    req.credentials = {
                        token,
                        user,
                    };
                    next();
                    return;
                } else {
                    next(new Error('Insufficent Permission'));
                }
            } else {
                next(new Error('Invalid auth-token'));
            }
        } else {
            next(new Error('Missing auth-token in headers'));
        }
    };
}

export async function resetAccountToTier(userUUID: string, tier: SubscriptionTypes) {
    //TODO: Reset the account to the below tier includes remove overflowing data

    const user = await database.get<Account>('accounts').getOne({ UUID: userUUID });

    if (user) {
        await database.get<Account>('accounts').update({ UUID: user.UUID }, { subscription_type: tier });

        const freeLimits = LIMITS[tier];

        const automations = await database.get<Automation>('automations').get({ userUUID });
        const toDeleteAutomations = getWhatToDeleteByNumber(automations, freeLimits.automationSlots);
        for await (const automation of toDeleteAutomations) {
            console.log('Not in free tier anymore, deleting automation', freeLimits.automationSlots, automation.ID);
            await database.get<Automation>('automations').delete({ ID: automation.ID });
        }

        const records = processes.filter(x => x.userUUID == user.UUID && x.getState() == 'RECORDING' || x.getState() == 'TRANSCODING');
        const toStopRecords = getWhatToDeleteByNumber(records, freeLimits.recordingSlots);
        for await (const record of toStopRecords) {
            console.log('Not in free tier anymore, deleting video', freeLimits.videoSlots, record.id);
            if (record.getState() == 'RECORDING') {
                await record.stopRecordAndTranscode();
                await new Promise<void>(resolve => {
                    record.onRecordingFinished(resolve);
                });
                await record.delete();
            }
        }

        const videos = processes.filter(x => x.userUUID == user.UUID && x.getState() == 'FINISHED');
        const toDeleteVideos = getWhatToDeleteByNumber(videos, freeLimits.videoSlots);
        for await (const video of toDeleteVideos) {
            console.log('Not in free tier anymore, deleting video', freeLimits.videoSlots, video.ID);
            await video.delete();
        }
    }
}

function getWhatToDeleteByNumber<T>(array: T[], number: number) {
    const toDelete = [];
    for (let i = 0; i < array.length; i++) {
        if (i >= number) {
            toDelete.push(array[i]);
        }
    }
    return toDelete;
}