
export type PricingTableKey = 'free' | 'premium' | 'advanced';

export type PricingTable = Record<PricingTableKey, PricingTableObject>;

export interface PricingTableObject {
    adFree: boolean;
    watchWhileRecording: boolean;
    recordingSlots: number;
    videoSlots: number;
    streamerSlots: number;
    maxRecordingTime: number;
    streamerCheckEvery: number;
    videoRetentionDays: number;
}

export function usePricingTable() {
    const pricingTable = ref<PricingTable>({
        free: {
            adFree: true,
            watchWhileRecording: false,
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
            recordingSlots: 4,
            videoSlots: 6,
            streamerSlots: 8,
            maxRecordingTime: 24,
            streamerCheckEvery: 1,
            videoRetentionDays: 7,
        },
        advanced: {
            adFree: true,
            watchWhileRecording: true,
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

