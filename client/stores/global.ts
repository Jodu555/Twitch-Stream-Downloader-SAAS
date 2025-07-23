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

export interface Automation {
    ID: string;
    userUUID: string;
    twitchStreamerName: string;
    everyxMinute: number;
    lastCheck: number;
    linkedAccountUUID?: string;
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

export interface Account {
    UUID: string;
    email: string;
    status: 'EMAIL_VERIFY_PENDING' | 'EMAIL_VERIFIED' | 'BANNED';
    emailVerifyCode: string;
    created_at: number;
    updated_at: number;
    subscription_type: SubscriptionTypes;
    last_renewed?: number;
    first_subscribed?: number;
    last_handshake?: number;
    last_login?: number;
    overrides?: string;
    notificationSettings?: NotificationSettings;
}

export interface NotificationSettings {
    discountCode: boolean;
    videoDeletion: boolean;
    recordingStart: boolean;
    recordingFinished: boolean;
    invoiceOpened: boolean;
    invoiceDue: boolean;
}

export const useGlobalStore = defineStore('globalStore', {
    state: () => ({
        streamers: [] as Streamer[],
        automations: [] as Automation[],
        videos: [] as RecordedVideo[],
        invoices: [] as Invoice[],
        auth: {
            isAuthenticated: false,
            token: '',
            user: null as Account | null,
            userData: {} as PricingTableObject,
        }
        // userData = ref<PricingTableObject>(usePricingTable().value[globalStore.auth.user?.subscription_type.toLowerCase() as PricingTableKey]);
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
        async onVideoDeletion(ID: string) {
            const video = this.videos.find((s) => s.id === ID);
            if (video) {
                this.videos.splice(this.videos.findIndex(x => x.id === ID), 1);
            } else {
                await this.fetchVideos();
            }
        },
        async onRecordingUpdate(ID: string, obj: Partial<Streamer>) {
            const streamer = this.streamers.find((s) => s.id === ID);
            // console.log('Attempting to update streamer', ID, streamer);
            if (streamer) {
                Object.assign(streamer, obj);
            } else {
                await this.fetchStreamers();
            }
        },
        async onAutomationUpdate(ID: string, obj: Partial<Automation>) {
            const automations = this.automations.find((s) => s.ID == ID);
            if (automations) {
                Object.assign(automations, obj);
            } else {
                await this.fetchAutomations();
            }
        },
        async onAutomationDeletion(ID: string) {
            const sniffEntry = this.automations.find((s) => s.ID == ID);
            if (sniffEntry) {
                this.automations.splice(this.automations.findIndex(s => s.ID == ID), 1);
            } else {
                await this.fetchAutomations();
            }
        },
        async fetchStreamers() {
            if (!this.auth.isAuthenticated) {
                return [];
            }
            const response = await $fetch<Streamer[]>('http://big.jodu555.de:8081/api/v1/records', {
                headers: {
                    'auth-token': this.auth.token,
                },
            });
            this.streamers = response;
            return response;
        },
        async fetchAutomations() {
            if (!this.auth.isAuthenticated) {
                return [];
            }
            const response = await $fetch<Automation[]>('http://big.jodu555.de:8081/api/v1/automations', {
                headers: {
                    'auth-token': this.auth.token,
                },
            });
            this.automations = response;
            return response;
        },
        async fetchVideos() {
            if (!this.auth.isAuthenticated) {
                return [];
            }
            const response = await $fetch<RecordedVideo[]>('http://big.jodu555.de:8081/api/v1/videos', {
                headers: {
                    'auth-token': this.auth.token,
                },
            });
            this.videos = response;
            return response;
        },
        async fetchInvoices() {
            if (!this.auth.isAuthenticated) {
                return [];
            }

            const response = await $fetch<Invoice[]>('http://big.jodu555.de:8081/api/v1/invoices', {
                headers: {
                    'auth-token': this.auth.token,
                },
            });
            this.invoices = response;
            return response;
        },
        async authenticate() {
            try {
                console.log('Authenticating user TRYING');
                if (this.auth.token == '') {
                    this.auth.token = useCookie('auth-token').value as string;
                }
                if (!this.auth.token)
                    return;
                const token = this.auth.token;

                const response = await $fetch<Account>('http://big.jodu555.de:8081/api/v1/auth/info', {
                    headers: {
                        'auth-token': token,
                    },
                });



                console.log('Authenticating user', response);
                this.auth.isAuthenticated = true;
                this.auth.user = response;
                this.auth.userData = usePricingTable().value[response.subscription_type];
                return response;
            } catch (error) {
                console.log('Authenticating user FAILED', error);
                const authCookie = useCookie('auth-token');
                authCookie.value = '';
                this.auth.token = '';
                this.auth.isAuthenticated = false;
                this.auth.user = null;
            }
        },
        async logout() {
            const response = await $fetch<Account>('http://big.jodu555.de:8081/api/v1/auth/logout', {
                headers: {
                    'auth-token': this.auth.token as string,
                },
            });
            const authCookie = useCookie('auth-token');
            authCookie.value = '';
            this.auth.token = '';
            this.auth.isAuthenticated = false;
            this.auth.user = null;
        }
    }
});