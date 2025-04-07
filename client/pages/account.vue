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
            </div>
            <div class="tab-pane fade" :class="{ active: selectedTab == 'Invoices', show: selectedTab == 'Invoices' }">
                <pre>
                    {{ { status, error } }}
                </pre>
                <div class="d-grid gap-2">
                    <button type="button" @click="refresh()" class="btn btn-outline-primary">
                        Refresh
                    </button>
                </div>

                <h2 class="text-center mt-3">Invoices</h2>
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
                                <th scope="row">{{ invoice.ID }}</th>
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
                                <h4 class="my-0" :class="{ [getRoleColor('premium' as PricingTableKey)]: true, }">{{
                                    keyToNiceName('premium' as PricingTableKey) }}</h4>
                            </div>
                            <ul class="mt-3 mb-4">
                                <li v-for="feature in cardTable['premium' as PricingTableKey].features" :key="feature">
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
            <div class="tab-pane fade">
                <h2 class="text-center">Linked Accounts</h2>
            </div>
        </div>
    </div>
</template>

<script lang="ts" setup>

const userData = useUserData();
const used = ref({
    recordingSlots: userData.value.recordingSlots - 2,
    videoSlots: userData.value.videoSlots - 2,
    streamerSlots: userData.value.streamerSlots - 1,
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
    { name: 'Linked Accounts', disabled: true },
] as { name: TabKeys, disabled: boolean; }[];

const selectedTab = ref<TabKeys>('Invoices');

type InvoiceStatus = 'UNPAID' | 'PENDING' | 'PAID' | 'FAILED';

interface BaseInvoice {
    ID: string;
    userUUID: string;
    createdAt: number;
    amount: number;
    status: InvoiceStatus;

}

interface InvoicePaid {
    paidAt: number;
    payPalOrderID: string;
    status: 'PAID';
}

interface InvoiceUnPaid {
    status: 'UNPAID';
}

type Invoice = BaseInvoice & (InvoicePaid | InvoiceUnPaid);

const { data: invoices, error, refresh, status } = await useFetch<Invoice[]>('http://138.201.131.52:8081/api/v1/invoices');


import { loadScript, type PayPalNamespace } from "@paypal/paypal-js";
const paypal = await loadScript({ currency: 'EUR', clientId: "AeW9es3hrOYHmwB8Fko2SzqnYt6UTkBPYuZZuBIdU5lcH0BVWz_9yv7Dm67LJuNwX2txj4c1zzth4XrM" });

const sortedInvoices = computed(() => {
    return invoices.value?.toSorted((a, b) => b.createdAt - a.createdAt);
});

watch(invoices, async (curr, prev) => {
    if (JSON.stringify(curr) == JSON.stringify(prev))
        return;
    await renderInvoicePaypalButtons();
});

async function renderInvoicePaypalButtons() {
    document.querySelectorAll('.paypal-button-container').forEach(x => x.innerHTML = '');
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
    await renderInvoicePaypalButtons();
});


</script>

<style scoped></style>