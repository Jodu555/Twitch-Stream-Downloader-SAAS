<template>
    <div>
        <h1 class="text-center">Account</h1>
        <div>
            <ul class="d-flex justify-content-around nav nav-tabs">
                <li v-for="tab in tabs" :key="tab.name" :style="{ cursor: tab.disabled ? 'not-allowed' : 'pointer' }"
                    class="nav-item">
                    <a class="nav-link" :class="{
                        active: selectedTab == tab.name,
                        disabled: tab.disabled,
                    }" @click="selectedTab = tab.name" :aria-disabled="tab.disabled">{{ tab.name }}</a>
                </li>
            </ul>
        </div>
        <div class="tab-content">
            <div class="tab-pane fade" :class="{ active: selectedTab == 'Infos', show: selectedTab == 'Infos' }">
                <h2 class="text-center mt-3">Infos</h2>
                <div class="row">
                    <div class="col-6 shadow-sm p-4 mb-5 rounded">
                        <h3 class="text-left">Account Info</h3>
                        <div class="mb-3 mt-3">
                            <label for="email" class="form-label">Email</label>
                            <input disabled type="email" class="form-control" id="email" aria-describedby="emailHelpId"
                                :value="globalStore.auth.user?.email" />
                        </div>
                        <div class="mb-3 mt-3">
                            <label for="subType" class="form-label">Subscription Type</label>
                            <input disabled type="text" class="form-control" id="subType"
                                :value="globalStore.auth.user?.subscription_type" />
                        </div>

                    </div>
                    <div class="col-6 shadow-sm p-4 mb-5 rounded">
                        <h3 class="text-left">Notification Settings</h3>
                        <pre>
                            {{ globalStore.auth.user?.notificationSettings }}
                        </pre>
                        <div v-for="notification in notificationSettings" :key="notification.id"
                            class="form-check form-switch">
                            <input class="form-check-input" type="checkbox" role="switch" :id="notification.id"
                                v-model="notification.enabled">
                            <label class="form-check-label" :for="notification.id">{{ notification.description
                            }}</label>
                        </div>

                    </div>
                </div>
            </div>
            <div class="tab-pane fade" :class="{ active: selectedTab == 'Invoices', show: selectedTab == 'Invoices' }">
                <!-- <pre>
                    {{ { status, error } }}
                </pre>
                <div class="d-grid gap-2">
                    <button type="button" @click="refresh()" class="btn btn-outline-primary">
                        Refresh
                    </button>
                </div> -->

                <h2 class="text-center mt-3 mb-2">Invoices</h2>
                <div class="table-responsive-lg">
                    <table class="table align-middle">
                        <thead>
                            <tr>
                                <th>Number</th>
                                <th>Date</th>
                                <th>State</th>
                                <th>Amount</th>
                                <th>Pay Now / Paid Date</th>
                            </tr>
                        </thead>
                        <tbody class="table-group-divider">
                            <tr v-for="invoice in sortedInvoices" :id="invoice.ID"
                                :class="{ 'table-danger': invoice.status == 'UNPAID' }">
                                <th scope="row">{{ invoice.ID.split('-')[0] }}</th>
                                <td>{{ new Date(invoice.createdAt).toLocaleString('de') }}</td>
                                <td style="text-transform: capitalize;">{{ invoice.status }}</td>
                                <td :class="{ 'text-danger': invoice.status == 'UNPAID' }">{{ invoice.amount }}€</td>
                                <td v-if="invoice.status == 'PAID'">{{ new Date(invoice.paidAt).toLocaleString('de') }}
                                </td>
                                <td class="paypal-button-container" :id="`paypal-button-container-${invoice.ID}`"
                                    v-else>

                                </td>
                            </tr>
                        </tbody>
                        <tfoot>

                        </tfoot>
                    </table>
                </div>

            </div>
            <div class="tab-pane fade"
                :class="{ active: selectedTab == 'Subscription Status', show: selectedTab == 'Subscription Status' }">
                <h2 class="text-center mt-3">Subscription Status</h2>
                <div class="d-flex justify-content-between">
                    <div class="card col-7">
                        <div class="card-body">
                            <h5 class="card-title">Current Limits</h5>
                            <div class="mb-2" v-for="key in Object.keys(used)" :key="key">
                                <span>{{ limitationToNiceName(key as keyof
                                    PricingTableObject) }}: {{ getHasHad(key).used }} / {{ getHasHad(key).has }}</span>
                                <div class="progress" role="progressbar" aria-label="Basic example" aria-valuenow="0"
                                    aria-valuemin="0" aria-valuemax="100">
                                    <div class="progress-bar" :style="{
                                        width: `${calcWidth(key)}%`,
                                    }">
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="card col-3 rounded-3 shadow-sm">
                        <div class="card-body">
                            <h5 class="card-title">Current Subscription</h5>
                            <div class="card-header fw-normal py-3">
                                <h4 class="my-0"
                                    :class="{ [getRoleColor(globalStore.auth.user?.subscription_type!)]: true, }">
                                    {{
                                        keyToNiceName(globalStore.auth.user?.subscription_type!) }}</h4>
                            </div>
                            <ul class="mt-3 mb-4">
                                <li v-for="feature in cardTable[globalStore.auth.user?.subscription_type!].features"
                                    :key="feature">
                                    {{
                                        feature }}</li>
                            </ul>
                            <div class="d-grid gap-2">
                                <button type="button" class="btn btn-outline-success">
                                    Upgrade
                                </button>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
            <div class="tab-pane fade"
                :class="{ active: selectedTab == 'Linked Accounts', show: selectedTab == 'Linked Accounts' }">
                <h2 class="text-center mt-3">Linked Accounts</h2>
                <div class="d-flex justify-content-center">
                    <div class="col-6">
                        <div class="d-grid gap-2">
                            <button type="button" @click="linkYoutubeAccount" class="btn btn-outline-warning">
                                Link A YouTube Account
                            </button>
                        </div>
                    </div>
                </div>

                <div class="list-group mt-4">
                    <div v-for="linkedAccount in linkedAccounts"
                        class="list-group-item list-group-item-action flex-column align-items-start">
                        <div class="d-flex w-100 justify-content-between">
                            <h5 class="mb-1">{{ linkedAccount.youtubeChannelName }}</h5>
                            <small class="text-muted">Added {{ new
                                Date(parseInt(linkedAccount.created_at as any as string)).toLocaleDateString('de')
                                }}</small>
                        </div>
                        <p class="mb-1">Used in <strong>3 Automations</strong></p>

                        <div class="d-flex justify-content-between">
                            <small class="text-muted">Playlist: <a href="#">*Klick*</a></small>
                            <button @click="unlinkAccount(linkedAccount.youtubeAccountID)" type="button"
                                class="btn btn-outline-danger">
                                Unlink
                            </button>
                        </div>

                    </div>
                </div>




            </div>
        </div>
    </div>
</template>

<script lang="ts" setup>

const route = useRoute();

definePageMeta({
    middleware: 'auth',
});

import { loadScript, type PayPalNamespace } from "@paypal/paypal-js";

async function linkYoutubeAccount() {
    try {
        const { data: response, error } = await tryCatch($fetch<{
            authUrl: string;
        }>(`http://138.201.131.52:8081/api/v1/youtube/getAuthURL`, {
            method: 'GET',
            headers: {
                'auth-token': globalStore.auth.token
            },
        }));
        if (error) {
            console.log(error);
            return;
        }

        // Open a popup window for authentication
        const authWindow = window.open(
            response.authUrl,
            'YouTube Authentication',
            'width=800,height=600'
        );

        // Monitor if window was closed without completing auth
        const checkClosed = setInterval(() => {
            if (authWindow?.closed) {
                clearInterval(checkClosed);
                // checkAuthStatus(); // Check if auth was successful
            }
        }, 1000);

    } catch (error) {
        console.error('Error initiating auth:', error);
        // setErrorMessage('Failed to start authentication process');
    }
}

async function unlinkAccount(youtubeAccountID: string) {
    const { data: response, error } = await tryCatch($fetch(`http://138.201.131.52:8081/api/v1/youtube/unlinkAccount?youtubeAccountID=${youtubeAccountID}`, {
        method: 'GET',
        headers: {
            'auth-token': globalStore.auth.token
        }
    }));
    if (error) {
        console.error(error);
        return;
    }
    console.log(response);
}

interface NotificationSettings {
    discountCode: boolean;
    videoDeletion: boolean;
    recordingStart: boolean;
    recordingFinished: boolean;
    openInvoice: boolean;
    invoiceDue: boolean;
}

const userNotificationSettings: NotificationSettings = {
    discountCode: true,
    videoDeletion: true,
    recordingStart: true,
    recordingFinished: true,
    openInvoice: true,
    invoiceDue: true,
};

interface NotificationObject {
    id: keyof NotificationSettings;
    enabled: boolean;
    description: string;
}

const notificationSettings = computed(() => {
    return (Object.keys(userNotificationSettings) as (keyof NotificationSettings)[]).map(x => {
        return { id: x, enabled: userNotificationSettings[x], description: notificationDescriptionLookup[x] };
    });
});

const notificationDescriptionLookup: Record<keyof NotificationSettings, string> = {
    'discountCode': 'Send a notification when there is a new Discount code',
    'videoDeletion': 'Send a notification if a Video is about to be deleted',
    'recordingStart': 'Send a notification when a recording is automatically started',
    'recordingFinished': 'Send a notification when a recording is finished',
    'openInvoice': 'Send a notification when an Invoice is opened',
    'invoiceDue': 'Send a notification when an Invoice is due',
};

const userData = computed(() => globalStore.auth.userData);

const globalStore = useGlobalStore();

export interface LinkedAccount {
    userUUID: string;
    youtubeAccountID: string;
    refreshToken: string;
    expiresAt: number;
    youtubeChannelName?: string;
    created_at: number;
    updated_at: number;
}

const { status: linkedAccountsStatus, data: linkedAccounts } = useFetch<LinkedAccount[]>('http://138.201.131.52:8081/api/v1/youtube/linkedAccounts', {
    headers: {
        'auth-token': globalStore.auth.token
    },
});

const used = computed(() => {
    return {
        recordingSlots: globalStore.streamers.length,
        videoSlots: globalStore.videos.length,
        automationSlots: globalStore.automations.length,
    };
});

function getHasHad(key: string) {
    const hasused = ((used.value as any)[key]) as number;
    const has = userData.value[key as keyof PricingTableObject] as number;
    return { used: hasused, has };
}

function calcWidth(key: string) {
    const vals = getHasHad(key);
    return (vals.used / vals.has * 100).toFixed(2);
}

type TabKeys = 'Infos' | 'Invoices' | 'Subscription Status' | 'Linked Accounts';

const tabs = [
    { name: 'Infos', disabled: false, },
    { name: 'Invoices', disabled: false },
    { name: 'Subscription Status', disabled: false },
    { name: 'Linked Accounts', disabled: false },
] as { name: TabKeys, disabled: boolean; }[];


let queryTab = route.query?.tab?.toString();

const found = tabs.map(x => x.name.toLowerCase()).find(x => x.includes(queryTab as any));
if (found !== undefined) {
    const actualName = tabs.find(x => x.name.toLowerCase() == found)?.name;
    console.log(actualName);
    route.query.tab = actualName as string;
    queryTab = actualName;
}

const selectedTab = ref<TabKeys>(queryTab == undefined ? 'Infos' : (queryTab as TabKeys));

watch(selectedTab, (newValue) => {
    useRouter().push({
        query: {
            ...route.query,
            tab: newValue,
        }
    });
});


const invoices = computed(() => globalStore.invoices);
const { error, refresh, status } = useAsyncData('invoices', globalStore.fetchInvoices);


const sortedInvoices = computed(() => {
    return invoices.value?.toSorted((a, b) => b.createdAt - a.createdAt);
});

watch(invoices, async (curr, prev) => {
    if (JSON.stringify(curr) == JSON.stringify(prev))
        return;
    await renderInvoicePaypalButtons();
});

async function renderInvoicePaypalButtons() {
    const paypal = await loadScript({ currency: 'EUR', clientId: "AeW9es3hrOYHmwB8Fko2SzqnYt6UTkBPYuZZuBIdU5lcH0BVWz_9yv7Dm67LJuNwX2txj4c1zzth4XrM" });
    document?.querySelectorAll('.paypal-button-container').forEach(x => x.innerHTML = '');
    try {
        if (paypal == null || paypal == undefined) {
            console.error("failed to load the PayPal JS SDK script");
            return;
        }
        for (const invoice of invoices.value!.filter(x => x.status == 'UNPAID')) {
            const selector = '#paypal-button-container-' + invoice.ID;
            document.querySelector(selector)!.innerHTML = '';
            await paypal.Buttons?.({
                fundingSource: 'paypal',
                style: {
                    color: 'gold',
                    shape: 'rect',
                    disableMaxWidth: true,
                },
                async onApprove(data) {
                    // Capture the funds from the transaction.
                    const { data: response, error } = await tryCatch($fetch<{
                        status: InvoiceStatus;
                    }>("http://138.201.131.52:8081/api/v1/paypal/captureOrder", {
                        method: "POST",
                        body: {
                            invoiceID: invoice.ID,
                            orderID: data.orderID,
                        },
                    }));

                    if (error) {
                        console.error(error);
                        alert(error);
                        return;
                    }

                    if (response.status == 'PAID') {
                        refresh();
                        await globalStore.authenticate();
                    }
                },
                onCancel(data) {
                    console.log(data);

                    // Show a cancel page, or return to cart
                    window.location.assign("/your-cancel-page");
                },
                onError(err) {
                    console.log(err);
                    alert(err);
                    // For example, redirect to a specific error page
                    // window.location.assign("/your-error-page-here");
                },
                async createOrder() {
                    try {
                        const { data: response, error } = await tryCatch($fetch<{
                            orderID: string;
                        }>("http://138.201.131.52:8081/api/v1/paypal/createOrder", {
                            method: "POST",
                            body: {
                                invoiceID: invoice.ID,
                            },
                        }));

                        if (error) {
                            console.error(error);
                            alert(error);
                            return '';
                        }

                        const orderData = response;

                        return orderData.orderID ?? '';

                    } catch (error) {
                        console.error(error);
                        throw error;
                    }
                }
            }).render(selector);

        }
    } catch (error) {
        console.error("failed to load the PayPal JS SDK script", error);
    }
}

onMounted(async () => {
    renderInvoicePaypalButtons();
});


</script>

<style scoped></style>