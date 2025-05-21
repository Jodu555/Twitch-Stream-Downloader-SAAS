import { Account, NotificationSettings } from 'src/utils/types';
import { Database } from '@jodu555/mysqlapi';
import { emailManager } from '..';
import { z } from 'zod';

const database = Database.getDatabase();

// type DataType<T extends keyof NotificationSettings> =
//     T extends 'DISCOUNT' ? { discountAmount: number; discountCode: string; } :
//     T extends 'VIDEO_ABT_DELETED' ? { videoName: string; } :
//     T extends 'RECORDING_AUTO_STARTED' ? { streamerName: string; } :
//     T extends 'RECORDING_AUTO_ENDED' ? { streamerName: string; } :
//     never;

export const notificationSchema = z.object(
    {
        discountCode: z.boolean(),
        videoDeletion: z.boolean(),
        recordingStart: z.boolean(),
        recordingFinished: z.boolean(),
        invoiceOpened: z.boolean(),
        invoiceDue: z.boolean(),
    });

type DataType<T extends keyof NotificationSettings> =
    T extends 'discountCode' ? { discountAmount: number; discountCode: string; } :
    T extends 'videoDeletion' ? { videoName: string; } :
    T extends 'recordingStart' ? { twitchStreamerName: string; } :
    T extends 'recordingFinished' ? { twitchStreamerName: string; } :
    T extends 'invoiceOpened' ? { invoiceID: string; } :
    T extends 'invoiceDue' ? { invoiceID: string; } :
    never;

export async function checkAndSendNotificationAccount<T extends keyof NotificationSettings>(user: Account, type: T, data: any) {
    if (typeof user.overrides === 'string') user.overrides = JSON.parse(user.overrides);
    if (typeof user.notificationSettings === 'string') user.notificationSettings = JSON.parse(user.notificationSettings);
    if (user.notificationSettings[type as keyof NotificationSettings] == false) return;

    console.log('TODO: Send Notification ', user.email, type);

    if (type === 'discountCode') {
        emailManager.sendEmail(user.UUID, 'DISCOUNT', {
            discountAmount: 10,
            discountCode: 'user.overrides.discountCode',
        });
    } else if (type === 'invoiceOpened') {
        emailManager.sendEmail(user.UUID, 'INVOICE_OPENED', {
            invoiceID: data.invoiceID,
        });
    } else if (type === 'invoiceDue') {
        emailManager.sendEmail(user.UUID, 'INVOICE_DUE', {
            invoiceID: data.invoiceID,
        });
    } else if (type === 'videoDeletion') {
        emailManager.sendEmail(user.UUID, 'VIDEO_ABT_DELETED', {
            videoName: data.videoName,
        });
    } else if (type === 'recordingStart') {
        emailManager.sendEmail(user.UUID, 'RECORDING_AUTO_STARTED', {
            streamerName: data.twitchStreamerName,
        });
    } else if (type === 'recordingFinished') {
        emailManager.sendEmail(user.UUID, 'RECORDING_AUTO_ENDED', {
            streamerName: data.twitchStreamerName,
        });
    }
}

export async function checkAndSendNotification<T extends keyof NotificationSettings>(userUUID: string, type: T, data: DataType<T>) {
    const account = await database.get<Account>('accounts').getOne({ UUID: userUUID });
    if (account) {
        if (typeof account.overrides === 'string') account.overrides = JSON.parse(account.overrides);
        if (typeof account.notificationSettings === 'string') account.notificationSettings = JSON.parse(account.notificationSettings);
        return await checkAndSendNotificationAccount(account, type, data);
    }

}