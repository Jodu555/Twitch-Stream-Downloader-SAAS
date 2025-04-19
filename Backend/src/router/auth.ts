import crypto from 'crypto';
import e, { Router, Request, NextFunction } from 'express';
import { Database } from '@jodu555/mysqlapi';
import { AuthToken, SniffEntry } from 'src/utils/types';
import { emailManager, io } from '..';
import { z } from 'zod';
import bcrypt from "bcryptjs";

const database = Database.getDatabase();

export const router = Router();

const registerLoginSchema = z.object({
    email: z.string().email().trim(),
    password: z.string().min(8).max(128).trim(),
});

interface Account {
    uuid: string;
    email: string;
    password: string;
    status: 'EMAIL_VERIFY_PENDING' | 'EMAIL_VERIFIED' | 'BANNED';
    emailVerifyCode: string;
    created_at: number;
    updated_at: number;
    subscription_type: 'FREE' | 'PREMIUM' | 'ADVANCED';
    last_renewed?: number;
    first_subscribed?: number;
    overrides?: string;
}

export interface AuthenticatedRequest extends Request {
    credentials?: {
        token: string;
        user: Omit<Account, 'password'>;
    };
}

router.post('/api/v1/auth/register', async (req, res, next) => {
    try {
        const user = registerLoginSchema.parse(req.body);

        const search = JSON.parse(JSON.stringify(user));

        delete search.password;
        search.unique = false;
        const result = await database.get<Account>('accounts').get({ email: user.email, unique: false });

        if (result.length == 0) {
            user.password = await bcrypt.hash(user.password, 8);
            const dbUser = {
                uuid: crypto.randomUUID(),
                email: user.email,
                password: user.password,
                status: 'EMAIL_VERIFY_PENDING',
                emailVerifyCode: Math.round(Math.random() * 99999999999).toString().split('').slice(5).join(''),
                created_at: Date.now(),
                updated_at: Date.now(),
                subscription_type: 'FREE',
            } as Account;
            await database.get<Account>('accounts').create(dbUser);

            emailManager.sendEmail(dbUser.uuid, 'VERIFICATION', {
                username: dbUser.email,
                verificationToken: dbUser.emailVerifyCode,
            });

            delete user.password;
            res.json(user);
        } else {
            next(new Error('The email or the username is already taken!'));
        }
    } catch (error) {
        next(error);
    }
});

router.post('/api/v1/auth/login', async (req, res, next) => {
    try {
        const user = registerLoginSchema.parse(req.body);
        const result = await database.get<Account>('accounts').get({ email: user.email, unique: true });
        if (result.length > 0) {
            if (await bcrypt.compare(user.password, result[0].password)) {
                const token = crypto.randomUUID();
                delete result[0].password;
                await database.get<AuthToken>('authtokens').create({
                    TOKEN: token,
                    UUID: result[0].uuid,
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

router.get('/api/v1/auth/logout', async (req: AuthenticatedRequest, res, next) => {
    const token = req.credentials?.token as string;
    await database.get<AuthToken>('authtokens').delete({ TOKEN: token });
    res.json({ message: 'Successfully logged out!' });
});

router.get('/api/v1/auth/info', async (req: AuthenticatedRequest, res, next) => {
    try {
        res.json(req.credentials?.user);
    } catch (error) {
        next(error);
    }
});

async function getUser(token: string) {
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

function authentication() {
    return authenticationFull(() => true);
}

function authenticationFull(cb: (user: Account) => boolean) {
    return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        const token = (req.headers['auth-token'] as string) || (req.query['auth-token'] as string);
        if (token) {
            const user = await getUser(token);
            if (user) {
                if (!cb || cb(user)) {
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

