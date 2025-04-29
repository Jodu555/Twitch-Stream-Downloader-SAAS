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

export type EmailTypes = 'VERIFICATION' | 'INVOICE_OPENED' | 'INVOICE_DUE' | 'DISCOUNT' | 'VIDEO_ABT_DELETED' | 'RECORDING_AUTO_STARTED' | 'RECORDING_AUTO_ENDED';
export type EmailStatus = 'PENDING' | 'SENT';
export interface Email {
    ID: string;
    userUUID: string;
    email_type: EmailTypes;
    status: EmailStatus;
    subject: string;
    html: string;
    text: string;
    data: string;
    sent_at: number | null;
    created_at: number;
}

export interface Account {
    UUID: string;
    email: string;
    password: string;
    status: 'EMAIL_VERIFY_PENDING' | 'EMAIL_VERIFIED' | 'BANNED';
    emailVerifyCode: string;
    created_at: number;
    updated_at: number;
    subscription_type: 'FREE' | 'PREMIUM' | 'ADVANCED';
    last_renewed?: number;
    first_subscribed?: number;
    last_handshake?: number;
    last_login?: number;
    overrides?: string;
}

export interface AuthToken {
    TOKEN: string;
    UUID: string;
}

export interface Automation {
    ID: string;
    userUUID: string;
    twitchStreamerName: string;
    everyxMinute: number;
    lastCheck: number;
    linkedAccountUUID?: string;
}
