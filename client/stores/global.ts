
export interface Streamer {
    id: string;
    watchingLive: boolean;
    twitchStreamerName: string;
    metas: MetaRepresent[];
    state: 'WAITING' | 'RECORDING' | 'TRANSCODING' | 'FINISHED';
    pid: number;
    videoMeta: VideoMeta;
    ffmpegMetadata: FfmpegMetadata;
    transcodingPid: number;
    recordingFilePath: string;
    imageLocation: string;
    imageUrl: string;
    createdAt: number;
}

export interface VideoMeta {
    time: string;
    size: string;
}

export interface MetaRepresent {
    title: string;
    category: string;
    time: number;
}

export interface FfmpegMetadata {
    frame: string;
    fps: string;
    size: string;
    time: string;
    bitrate: string;
    speed: string;
    from: number;
}

export interface SniffEntry {
    twitchStreamerName: string;
    everyxMinute: number;
    users?: string[];
    lastCheck: number;
}

export interface RecordedVideo {
    id: string;
    finishedAt: number;
    createdAt: number;
    twitchStreamerName: string;
    metas: MetaRepresent[];
    videoMeta: {
        time: string;
        size: string;
    };
    ffmpegMetadata?: FfmpegMetadata;
}

export interface MetaRepresent {
    title: string;
    category: string;
    time: number;
}

export interface FfmpegMetadata {
    frame: string;
    fps: string;
    size: string;
    time: string;
    bitrate: string;
    speed: string;
    from: number;
}


export type InvoiceStatus = 'UNPAID' | 'PENDING' | 'PAID' | 'FAILED';

export interface BaseInvoice {
    ID: string;
    userUUID: string;
    createdAt: number;
    amount: number;
    status: InvoiceStatus;

}

export interface InvoicePaid {
    paidAt: number;
    payPalOrderID: string;
    status: 'PAID';
}

export interface InvoiceUnPaid {
    status: 'UNPAID';
}

export type Invoice = BaseInvoice & (InvoicePaid | InvoiceUnPaid);


export const useGlobalStore = defineStore('globalStore', {
    state: () => ({
        streamers: [] as Streamer[],
        sniffEntrys: [] as SniffEntry[],
        videos: [] as RecordedVideo[],
        invoices: [] as Invoice[],
    }),
    actions: {
        async onVideoUpdate(ID: string, obj: Partial<RecordedVideo>) {
            const video = this.videos.find((s) => s.id === ID);
            if (video) {
                Object.assign(video, obj);
            } else {
                await this.fetchVideos();
            }
        },
        async onRecordingUpdate(ID: string, obj: Partial<Streamer>) {
            const streamer = this.streamers.find((s) => s.id === ID);
            console.log('Attempting to update streamer', ID, streamer);
            if (streamer) {
                Object.assign(streamer, obj);
            } else {
                await this.fetchStreamers();
            }
        },
        async onMonitoringUpdate(streamer: string, obj: Partial<SniffEntry>) {
            const sniffEntry = this.sniffEntrys.find((s) => s.twitchStreamerName.toLowerCase() === streamer.toLowerCase());
            if (sniffEntry) {
                Object.assign(sniffEntry, obj);
            } else {
                await this.fetchSniffEntrys();
            }
        },
        async fetchStreamers() {
            const response = await $fetch<Streamer[]>('http://138.201.131.52:8081/api/v1/streamers');
            this.streamers = response;
            return response;
        },
        async fetchSniffEntrys() {
            const response = await $fetch<SniffEntry[]>('http://138.201.131.52:8081/api/v1/sniffEntrys');
            this.sniffEntrys = response;
            return response;
        },
        async fetchVideos() {
            const response = await $fetch<RecordedVideo[]>('http://138.201.131.52:8081/api/v1/videos');
            this.videos = response;
            return response;
        },
        async fetchInvoices() {
            const response = await $fetch<Invoice[]>('http://138.201.131.52:8081/api/v1/invoices');
            this.invoices = response;
            return response;
        }
    }
});