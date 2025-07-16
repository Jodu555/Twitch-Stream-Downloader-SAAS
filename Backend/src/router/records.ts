import { Router } from 'express';
import { Database } from '@jodu555/mysqlapi';
import { Automation } from 'src/utils/types';
import { io, processes } from '..';
import { AuthenticatedRequest, authentication } from './auth';
import { z } from 'zod';
import { getUserLimit, getUserLimitByAccount, isAbleToCreateAutomation, isAbleToHaveVideo, isAbleToRecord, PermissionError } from '../utils/permissions';
import RecordEntry from '../RecordEntry';
import { isLive } from 'src/streamLinkHelpers';

const database = Database.getDatabase();

export const router = Router();


router.get('/api/v1/records', authentication(), async (req: AuthenticatedRequest, res) => {
    const userUUID = req.credentials.user.UUID;
    res.json(processes.filter(x => x.userUUID == userUUID).filter(x => x.getState() == 'RECORDING' || x.getState() == 'TRANSCODING').map(x => x.toFrontend()));
});

router.post('/api/v1/records/', authentication(), async (req: AuthenticatedRequest, res, next) => {
    try {
        const user = req.credentials.user;
        //TODO: Check if user is allowed to record
        const parse = z.object({
            name: z.string(),
            watchLive: z.boolean().optional().default(false),
        });
        const reqData = parse.parse(req.body);
        const twitchUsername = reqData.name;
        const watchLive = reqData.watchLive;

        if (watchLive == true && await getUserLimitByAccount(user, 'watchWhileRecording') == false) {
            return next(new PermissionError('Not able to watch while recording! Hit Limit'));
        }

        if (!await isAbleToRecord(user)) {
            return next(new PermissionError('Not able to record! Hit recording limit!'));
        }

        if (!await isAbleToHaveVideo(user)) {
            return next(new PermissionError('Not able to record! Hit video limit!'));
        }

        if (!await isLive(twitchUsername)) {
            return next(new PermissionError('The Streamer ' + twitchUsername + ' is not live!'));
        }

        const entry = new RecordEntry(user.UUID, twitchUsername, undefined, watchLive);
        processes.push(entry);
        entry.onRecordingFinished(() => {
            console.log('Recording Finished for', entry.toFrontend());
        });
        res.json({
            id: entry.id,
            twitchStreamerName: entry.twitchStreamerName,
            watchLive,
        });
        entry.record();
    } catch (error) {
        next(error);
    }
});

router.get('/api/v1/records/:id/transcode', authentication(), async (req: AuthenticatedRequest, res) => {
    const userUUID = req.credentials.user.UUID;
    const parse = z.object({
        id: z.string(),
    });
    const reqData = parse.parse(req.params);
    const process = processes.filter(x => x.userUUID == userUUID).find(x => x.id == reqData.id);
    if (process == null) {
        res.status(404).send('Process Not Found');
        return;
    }
    if (process.getState() != 'RECORDING') {
        res.status(404).send('Process Not in state recording');
        return;
    }
    await process.callCleanup();
    res.send('Transcoded');
});