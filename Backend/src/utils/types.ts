import { RecordEntryState } from 'src/RecordEntry';

export interface SniffEntry {
    twitchStreamerName: string;
    everyxMinute: number;
    userUUID: string;
    lastCheck: number;
}

export interface DatabaseInvoice {
    ID: string;
    userUUID: string;
    paypalOrderID: string;
    amount: number;
    status: 'UNPAID' | 'PENDING' | 'PAID' | 'FAILED';
    createdAt: number;
    paidAt: number;
}

export interface DatabaseRecordEntry {
    ID: string;
    twitchStreamerName: string;
    userUUID: string;
    state: RecordEntryState;
    metas: string;
    videoMeta: string;
    createdAt: number;
    deletedAt: number;
    finishedAt: number;
    recordingFilePath: string;
    outputFilePath: string;
    imageFilePath: string;
    imageUrl: string;
}

interface Email {
    ID: string;
    userUUID: string;
    email_type: 'VERIFICATION' | 'INVOICE_OPENED' | 'INVOICE_DUE' | 'DISCOUNT' | 'VIDEO_ABT_DELETED' | 'RECORDING_AUTO_STARTED' | 'RECORDING_AUTO_ENDED';
    status: string;
    sent_at: number | null;
    created_at: number;
}