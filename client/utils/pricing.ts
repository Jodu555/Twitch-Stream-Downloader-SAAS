
export type PricingTableKey = 'free' | 'premium' | 'advanced';

export type PricingTable = Record<PricingTableKey, PricingTableObject>;

export interface PricingTableObject {
    adFree: boolean;
    watchWhileRecording: boolean;
    resumableStream: boolean;
    recordingSlots: number;
    videoSlots: number;
    streamerSlots: number;
    maxRecordingTime: number;
    streamerCheckEvery: number;
    videoRetentionDays: number;
}

export function getRoleColor(key: PricingTableKey) {
    switch (key) {
        case 'free':
            return 'text-secondary-emphasis';
        case 'premium':
            return 'text-light-emphasis';
        case 'advanced':
            return 'text-warning-emphasis';
    }
}

export function usePricingTable() {
    const pricingTable = ref<PricingTable>({
        free: {
            adFree: true,
            watchWhileRecording: false,
            resumableStream: false,
            recordingSlots: 1,
            videoSlots: 2,
            streamerSlots: 3,
            maxRecordingTime: 8,
            streamerCheckEvery: 30,
            videoRetentionDays: 2,
        },
        premium: {
            adFree: true,
            watchWhileRecording: false,
            resumableStream: true,
            recordingSlots: 4,
            videoSlots: 6,
            streamerSlots: 8,
            maxRecordingTime: 24,
            streamerCheckEvery: 5,
            videoRetentionDays: 7,
        },
        advanced: {
            adFree: true,
            watchWhileRecording: true,
            resumableStream: true,
            recordingSlots: 8,
            videoSlots: 20,
            streamerSlots: 15,
            maxRecordingTime: 24,
            streamerCheckEvery: 1,
            videoRetentionDays: 14,
        },
    });

    return pricingTable;
}


export function keyToNiceName(key: PricingTableKey) {
    switch (key) {
        case 'free':
            return 'Free';
        case 'premium':
            return 'Premium';
        case 'advanced':
            return 'Advanced';
    }
}

export function limitationToNiceName(key: keyof PricingTableObject) {
    switch (key) {
        case 'adFree':
            return 'Ad-Free';
        case 'watchWhileRecording':
            return 'Watch While Recording';
        case 'resumableStream':
            return 'Resumable Stream';
        case 'recordingSlots':
            return 'Recording Slots';
        case 'videoSlots':
            return 'Video Slots';
        case 'streamerSlots':
            return 'Streamer Slots';
        case 'maxRecordingTime':
            return 'Max. Recording Time';
        case 'streamerCheckEvery':
            return 'Streamer Check Every Minutes';
        case 'videoRetentionDays':
            return 'Video Retention Days';
    }
}

export type CardTable = Record<PricingTableKey, {
    price: number;
    features: string[];
}>;

export const cardTable = ref<CardTable>({
    free: {
        price: 0,
        features: [
            'Completely Ad-Free',
            '1 Simultaneous Stream Recording',
            '2 Recorded Streams',
            '3 Streamer Monitorings',
            '8 Hours Recording Time',
            '30 Minute Check for new Streams',
            '2 Days Video Retention',
        ],
    },
    premium: {
        price: 10,
        features: [
            'Completely Ad-Free',
            'Resumable: If Stream stops for a short time',
            '5 Simultaneous Stream Recordings',
            '7 Recorded Streams',
            '7 Streamer Monitorings',
            '24 Hours Recording Time',
            '1 Minute Check for new Streams',
            '7 Days Video Retention',
        ],
    },
    advanced: {
        price: 25,
        features: [
            'Completely Ad-Free',
            'Watch Live While Recording',
            'Resumable: If Stream stops for a short time',
            '8 Simultaneous Stream Recordings',
            '20 Recorded Streams',
            '11 Streamer Monitorings',
            '24 Hours Recording Time',
            '1 Minute Check for new Streams',
            '14 Days Video Retention',
        ],
    },
});