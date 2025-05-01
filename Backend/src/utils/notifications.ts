import { Account, NotificationSettings } from 'src/utils/types';
import { Database } from '@jodu555/mysqlapi';

const database = Database.getDatabase();

// export interface NotificationSettings {
//     discountCode: boolean;
//     videoDeletion: boolean;
//     recordingStart: boolean;
//     recordingFinished: boolean;
//     openInvoice: boolean;
//     invoiceDue: boolean;
// }

export async function checkAndSendNotificationAccount(user: Account, type: keyof NotificationSettings) {
    if (user.notificationSettings[type] == false) return;

    console.log('TODO: Send Notification ', user.email, type);
}

export async function checkAndSendNotification(userUUID: string, type: keyof NotificationSettings) {
    const account = await database.get<Account>('accounts').getOne({ UUID: userUUID });
    if (account) {
        if (typeof account.overrides === 'string') account.overrides = JSON.parse(account.overrides);
        if (typeof account.notificationSettings === 'string') account.notificationSettings = JSON.parse(account.notificationSettings);
        return await checkAndSendNotificationAccount(account, type);
    }

}