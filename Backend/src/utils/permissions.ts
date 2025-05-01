import { Database } from '@jodu555/mysqlapi';
import { Account, Automation, SubscriptionTypes } from 'src/utils/types';
import { processes } from '..';

const database = Database.getDatabase();

export interface LimitKeys {
    adFree: boolean;
    watchWhileRecording: boolean;
    resumableStream: boolean;
    recordingSlots: number;
    videoSlots: number;
    automationSlots: number;
    maxRecordingTime: number;
    streamerCheckEvery: number;
    videoRetentionDays: number;
}

const LIMITS: Record<SubscriptionTypes, LimitKeys> = {
    FREE: {
        adFree: true,
        watchWhileRecording: false,
        resumableStream: false,
        recordingSlots: 1,
        videoSlots: 2,
        automationSlots: 3,
        maxRecordingTime: 8,
        streamerCheckEvery: 30,
        videoRetentionDays: 2,
    },
    PREMIUM: {
        adFree: true,
        watchWhileRecording: false,
        resumableStream: true,
        recordingSlots: 4,
        videoSlots: 6,
        automationSlots: 8,
        maxRecordingTime: 24,
        streamerCheckEvery: 5,
        videoRetentionDays: 7,
    },
    ADVANCED: {
        adFree: true,
        watchWhileRecording: true,
        resumableStream: true,
        recordingSlots: 8,
        videoSlots: 20,
        automationSlots: 15,
        maxRecordingTime: 24,
        streamerCheckEvery: 1,
        videoRetentionDays: 14,
    },
};

export class PermissionError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'PermissionError';
    }
}

export async function getUserLimits(userUUID: string): Promise<LimitKeys> {
    const search = await database.get<Account>('accounts').getOne({ UUID: userUUID });

    let limits: LimitKeys;
    if (search !== undefined && typeof search.overrides === 'string') {
        limits = { ...LIMITS[search.subscription_type], ...JSON.parse(search.overrides || '{}') };
    } else {
        limits = { ...LIMITS['FREE'] };
    }

    return limits;
}
export async function getUserLimit<K extends keyof LimitKeys>(userUUID: string, key: K): Promise<LimitKeys[K]> {
    const limits = await getUserLimits(userUUID);
    return limits[key];
}

export async function getUserLimitsByAccount(search: Account): Promise<LimitKeys> {

    let limits: LimitKeys;
    if (search !== undefined) {
        if (typeof search.overrides === 'string') {
            limits = { ...LIMITS[search.subscription_type], ...JSON.parse(search.overrides || '{}') };
        } else {
            limits = { ...LIMITS[search.subscription_type], ...search.overrides };
        }
    } else {
        limits = { ...LIMITS['FREE'] };
    }

    return limits;
}

export async function getUserLimitByAccount<K extends keyof LimitKeys>(user: Account, key: K): Promise<LimitKeys[K]> {
    const limits = await getUserLimitsByAccount(user);
    return limits[key];
}

export async function isAbleToRecord(user: Account) {

    const usedSlots = processes.filter(x => x.getState() == 'RECORDING' && x.userUUID == user.UUID).length;

    const recordingSlotLimit = await getUserLimitByAccount(user, 'recordingSlots');

    if (recordingSlotLimit == -1) {
        return true;
    }
    return usedSlots < recordingSlotLimit;
}

export async function isAbleToHaveVideo(user: Account) {
    const usedSlots = processes.filter(x => x.getState() == 'FINISHED' && x.userUUID == user.UUID).length;

    const videoSlotLimit = await getUserLimitByAccount(user, 'videoSlots');

    if (videoSlotLimit == -1) {
        return true;
    }
    return usedSlots < videoSlotLimit;
}


export async function isAbleToCreateAutomation(user: Account) {

    const automations = await database.get<Automation>('automations').get({ userUUID: user.UUID });
    const usedSlots = automations.length;

    const automationSlotLimit = await getUserLimitByAccount(user, 'automationSlots');

    if (automationSlotLimit == -1) {
        return true;
    }
    return usedSlots < automationSlotLimit;
}