import crypto from 'crypto';
import e, { Router, Request, Response, NextFunction } from 'express';
import { Database } from '@jodu555/mysqlapi';
import { Account, AuthToken, SniffEntry } from 'src/utils/types';
import { emailManager, io } from '..';
import { z } from 'zod';
import bcrypt from "bcryptjs";

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
        user: Omit<Account, 'password'>;
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
            const user = {
                UUID: crypto.randomUUID(),
                email: registerData.email,
                password: registerData.password,
                status: 'EMAIL_VERIFY_PENDING',
                emailVerifyCode: Math.round(Math.random() * 99999999999).toString().split('').slice(5).join(''),
                created_at: Date.now(),
                updated_at: Date.now(),
                subscription_type: 'FREE',
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
            if (await bcrypt.compare(user.password, user.password)) {
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

