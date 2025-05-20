import { google } from 'googleapis';
import fs from 'fs';
import { Router } from 'express';
import { Database } from '@jodu555/mysqlapi';
import { Automation, LinkedAccount } from 'src/utils/types';
import { io, processes } from '..';
import { AuthenticatedRequest, authentication } from './auth';
import { z } from 'zod';
import { getUserLimit, getUserLimitByAccount, isAbleToCreateAutomation, isAbleToHaveVideo, isAbleToRecord, PermissionError } from '../utils/permissions';
import RecordEntry from '../RecordEntry';

const database = Database.getDatabase();

export const router = Router();

const SCOPES = ['https://www.googleapis.com/auth/youtube.upload', 'https://www.googleapis.com/auth/youtubepartner-channel-audit'];


// interface Credentials {
//     installed: {
//         client_id: string;
//         client_secret: string;
//         redirect_uris: string[];
//     };
// }

if (!fs.existsSync(process.env.GOOGLE_CREDENTIALS_PATH)) {
    throw new Error('Google Credentials File not found! At:' + process.env.GOOGLE_CREDENTIALS_PATH);
}
const credentialsFileContent = fs.readFileSync(process.env.GOOGLE_CREDENTIALS_PATH, 'utf8');
const credentials = JSON.parse(credentialsFileContent) as any;

const oauth2Client = new google.auth.OAuth2(
    credentials.web.client_id,
    credentials.web.client_secret,
    credentials.web.redirect_uris[0]
);;


router.get('/api/v1/youtube/getAuthURL', authentication(), async (req: AuthenticatedRequest, res) => {
    const userUUID = req.credentials.user.UUID;
    const authUrl = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        prompt: 'consent',
        scope: SCOPES,
        redirect_uri: 'http://big.jodu555.de:3001/google/callback',
    });
    console.log('Auth URL:', authUrl);
    res.json({ authUrl });
});

router.get('/api/v1/youtube/callback', authentication(), async (req: AuthenticatedRequest, res, next) => {
    console.log('Callback received:', req.query, req.params);

    try {
        const { code } = z.object({ code: z.string() }).parse(req.query);

        const { tokens } = await oauth2Client.getToken(code);
        console.log(tokens);

        oauth2Client.setCredentials(tokens);

        const youtube = google.youtube({ version: 'v3', auth: oauth2Client });

        const channelResponse = await youtube.channels.list({ part: ['id', 'snippet'], mine: true });
        const channel = channelResponse.data.items[0];
        console.log(channel);

        const userUUID = req.credentials.user.UUID;
        await database.get<LinkedAccount>('linkedAccounts').create({
            userUUID,
            youtubeAccountID: channel.id,
            refreshToken: tokens.refresh_token,
            expiresAt: Date.now() + (tokens as any).refresh_token_expires_in,
            youtubeChannelName: channel.snippet.title,
        });

        res.json({ success: true });
    } catch (error) {
        console.error('Error getting token:', error);
        next(error);
    }
});

router.get('/api/v1/youtube/linkedAccounts', authentication(), async (req: AuthenticatedRequest, res) => {
    const userUUID = req.credentials.user.UUID;
    const linkedAccounts = await database.get<LinkedAccount>('linkedAccounts').get({ userUUID });
    res.json(linkedAccounts.map((account) => {
        delete account.refreshToken;
        delete account.expiresAt;
        return account;
    }));
});