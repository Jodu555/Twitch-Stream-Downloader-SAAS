import { Router } from 'express';
import { Database } from '@jodu555/mysqlapi';
import { SniffEntry } from 'src/utils/types';
import { io } from '..';
import { z } from 'zod';

const database = Database.getDatabase();

export const router = Router();

const registerSchema = z.object({
    username: z.string().min(3).max(32).trim().regex(/^[a-zA-Z0-9_-]+$/).,
    email: z.string().email().trim(),
    password: z.string().min(8).max(128).trim(),
});

router.post('/register', async (req, res, next) => {
    try {
        const data = registerSchema.safeParse(req.body);

        if (!data.success) {
            next(data.error);
            return;
        }

        data.;

        let restrictedResult = false;

        if (typeof authHelper.options.restrictedRegister == 'function') {
            restrictedResult = authHelper.options.restrictedRegister(validation);
            if (!restrictedResult) {
                next(new Error('Restricted Registration!'));
                return;
            }
        }

        const search = { ...user }; //Spreading to disable the reference
        delete search.password;
        search.unique = false;
        const result = await database.get('accounts').get(search);
        if (result.length == 0) {
            user.password = await bcrypt.hash(user.password, 8);
            await database.get('accounts').create(user);
            await authHelper.onRegister?.(user);

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
        const validation = database.getSchema('loginSchema').validate(req.body, true);
        const user = validation.object;
        const result = await database.get('accounts').get({ username: user.username, unique: true });
        if (result.length > 0) {
            if (await bcrypt.compare(user.password, result[0].password)) {
                const token = generateUUID();
                delete result[0].password;
                authHelper.addToken(token, result[0]);
                await authHelper.onLogin?.(token, result[0]);
                res.json({ token });
            } else {
                next(new Error('Invalid password!'));
            }
        } else {
            const value = user.username ? 'username' : 'email';
            next(new Error('Invalid ' + value + '!'));
        }
    } catch (error) {
        next(error);
    }
});

router.get('/logout', async (req, res, next) => {
    const token = req.credentials?.token as string;
    authHelper.removeToken(token);
    res.json({ message: 'Successfully logged out!' });
});

router.get('/info', async (req, res, next) => {
    try {
        res.json(req.credentials?.user);
    } catch (error) {
        next(error);
    }
});