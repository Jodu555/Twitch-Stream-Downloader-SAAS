
export type SubscriptionTypes = 'FREE' | 'PREMIUM' | 'ADVANCED';

export type PricingTable = Record<SubscriptionTypes, PricingTableObject>;

export interface PricingTableObject {
    adFree: boolean;
    watchWhileRecording: boolean;
    // resumableStream: boolean;
    recordingSlots: number;
    videoSlots: number;
    automationSlots: number;
    maxRecordingTime: number;
    streamerCheckEvery: number;
    videoRetentionDays: number;
}

export function getRoleColor(key: SubscriptionTypes) {
    switch (key) {
        case 'FREE':
            return 'text-secondary-emphasis';
        case 'PREMIUM':
            return 'text-light-emphasis';
        case 'ADVANCED':
            return 'text-warning-emphasis';
    }
}

export function usePricingTable() {
    const pricingTable = ref<PricingTable>({
        FREE: {
            adFree: true,
            watchWhileRecording: false,
            // resumableStream: false,
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
            // resumableStream: true,
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
            // resumableStream: true,
            recordingSlots: 8,
            videoSlots: 20,
            automationSlots: 15,
            maxRecordingTime: 24,
            streamerCheckEvery: 1,
            videoRetentionDays: 14,
        },
    });

    return pricingTable;
}


export function keyToNiceName(key: SubscriptionTypes) {
    switch (key) {
        case 'FREE':
            return 'Free';
        case 'PREMIUM':
            return 'Premium';
        case 'ADVANCED':
            return 'Advanced';
    }
}

export function limitationToNiceName(key: keyof PricingTableObject) {
    switch (key) {
        case 'adFree':
            return 'Ad-Free';
        case 'watchWhileRecording':
            return 'Watch While Recording';
        // case 'resumableStream':
        //     return 'Resumable Stream';
        case 'recordingSlots':
            return 'Recording Slots';
        case 'videoSlots':
            return 'Video Slots';
        case 'automationSlots':
            return 'Automation Slots';
        case 'maxRecordingTime':
            return 'Max. Recording Time';
        case 'streamerCheckEvery':
            return 'Streamer Check Every Minutes';
        case 'videoRetentionDays':
            return 'Video Retention Days';
    }
}

export type CardTable = Record<SubscriptionTypes, {
    price: number;
    features: string[];
}>;

export const cardTable = ref<CardTable>({
    FREE: {
        price: 0,
        features: [
            'Completely Ad-Free',
            '1 Simultaneous Stream Recording',
            '2 Recorded Streams',
            '3 Automation Slots',
            '8 Hours Recording Time',
            '30 Minute Check for new Streams',
            '2 Days Video Retention',
        ],
    },
    PREMIUM: {
        price: 10,
        features: [
            'Completely Ad-Free',
            // 'Resumable: If Stream stops for a short time',
            '5 Simultaneous Stream Recordings',
            '7 Recorded Streams',
            '7 Automation Slots',
            '24 Hours Recording Time',
            '1 Minute Check for new Streams',
            '7 Days Video Retention',
        ],
    },
    ADVANCED: {
        price: 25,
        features: [
            'Completely Ad-Free',
            'Watch Live While Recording',
            // 'Resumable: If Stream stops for a short time',
            '8 Simultaneous Stream Recordings',
            '20 Recorded Streams',
            '11 Automation Slots',
            '24 Hours Recording Time',
            '1 Minute Check for new Streams',
            '14 Days Video Retention',
        ],
    },
});