import crypto from 'crypto';
import { Router, Request, NextFunction } from 'express';
import { Database } from '@jodu555/mysqlapi';
import { SniffEntry } from 'src/utils/types';
import { io } from '..';
import { z } from 'zod';
import bcrypt from "bcryptjs";

const database = Database.getDatabase();

export const router = Router();

const registerLoginSchema = z.object({
    email: z.string().email().trim(),
    password: z.string().min(8).max(128).trim(),
});

interface Account {
    email: string;
    password: string;
}

export interface AuthenticatedRequest extends Request {
    credentials?: {
        token: string;
        user: Omit<Account, 'password'>;
    };
}

router.post('/register', async (req, res, next) => {
    try {
        const user = registerLoginSchema.parse(req.body);

        const search = JSON.parse(JSON.stringify(user));

        delete search.password;
        search.unique = false;
        const result = await database.get<Account>('accounts').get({ email: user.email, unique: false });

        if (result.length == 0) {
            user.password = await bcrypt.hash(user.password, 8);
            await database.get('accounts').create(user);
            delete user.password;
            res.json(user);
        } else {
            next(new Error('The email or the username is already taken!'));
        }
    } catch (error) {
        next(error);
    }
});

router.post('/login', async (req, res, next) => {
    try {
        const user = registerLoginSchema.parse(req.body);
        const result = await database.get<Account>('accounts').get({ email: user.email, unique: true });
        if (result.length > 0) {
            if (await bcrypt.compare(user.password, result[0].password)) {
                const token = crypto.randomUUID();
                delete result[0].password;
                //TODO: save token in database
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

router.get('/logout', async (req: AuthenticatedRequest, res, next) => {
    const token = req.credentials?.token as string;
    //TODO: remove token from database
    res.json({ message: 'Successfully logged out!' });
});

router.get('/info', async (req: AuthenticatedRequest, res, next) => {
    try {
        res.json(req.credentials?.user);
    } catch (error) {
        next(error);
    }
});

function searchToken(token: string) {
    //TODO: search token in database
    return true;
}

function authentication() {
    return authenticationFull(() => true);
}

function authenticationFull(cb: (user: Account) => boolean) {
    return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        const token = (req.headers['auth-token'] as string) || (req.query['auth-token'] as string);
        if (token) {
            if (await this.getUser(token)) {
                const user = await this.getUser(token);
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

