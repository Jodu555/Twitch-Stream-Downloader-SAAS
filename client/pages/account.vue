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
                            <tr v-for="invoice in invoices.sort((a, b) => b.createdAt - a.createdAt)" :id="invoice.ID"
                                :class="{ 'table-danger': invoice.state == 'Unpaid' }">
                                <th scope="row">{{ invoice.ID }}</th>
                                <td>{{ new Date(invoice.createdAt).toLocaleString('de') }}</td>
                                <td>{{ invoice.state }}</td>
                                <td :class="{ 'text-danger': invoice.state == 'Unpaid' }">{{ invoice.amount }}€</td>
                                <td v-if="invoice.state == 'Paid'">{{ new Date(invoice.paidAt).toLocaleString('de') }}
                                </td>
                                <td id="paypal-button-container" v-else>

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
            </div>
            <div class="tab-pane fade">
                <h2 class="text-center">Linked Accounts</h2>
            </div>
        </div>
    </div>
</template>

<script lang="ts" setup>

type TabKeys = 'Infos' | 'Invoices' | 'Subscription Status' | 'Linked Accounts';

const tabs = [
    { name: 'Infos', disabled: false, },
    { name: 'Invoices', disabled: false },
    { name: 'Subscription Status', disabled: false },
    { name: 'Linked Accounts', disabled: true },
] as { name: TabKeys, disabled: boolean; }[];

const selectedTab = ref<TabKeys>('Infos');

interface BaseInvoice {
    ID: string;
    createdAt: number;
    amount: number;
}

interface InvoicePaid {
    paidAt: number;
    state: 'Paid';
}

interface InvoiceUnPaid {
    state: 'Unpaid';
}

type Invoice = BaseInvoice & (InvoicePaid | InvoiceUnPaid);

const invoices = ref<Invoice[]>([
    {
        ID: '1',
        createdAt: Date.now() - 1000 * 60 * 60 * 24,
        paidAt: Date.now() - 1000 * 60 * 60 * 12,
        state: 'Paid',
        amount: 100,
    },
    {
        ID: '2',
        createdAt: Date.now() - 1000 * 60 * 60,
        state: 'Unpaid',
        amount: 100,
    },
]);


import { loadScript, type PayPalNamespace } from "@paypal/paypal-js";
const paypal = await loadScript({ currency: 'EUR', clientId: "AeW9es3hrOYHmwB8Fko2SzqnYt6UTkBPYuZZuBIdU5lcH0BVWz_9yv7Dm67LJuNwX2txj4c1zzth4XrM" });

watch(selectedTab, async () => {
    if (selectedTab.value == 'Invoices') {
        if (paypal == null || paypal == undefined) {
            console.error("failed to load the PayPal JS SDK script");
            return;
        }
        await paypal.Buttons?.({
            fundingSource: 'paypal',
            // onInit
            style: {
                color: 'gold',
                shape: 'rect',
                disableMaxWidth: true,
            },
            async onApprove(data) {
                // Capture the funds from the transaction.
                // const response = await fetch("/my-server/capture-paypal-order", {
                // 	method: "POST",
                // 	body: JSON.stringify({
                // 		orderID: data.orderID
                // 	})
                // });

                // const details = await response.json();

                // Show success message to buyer
                alert(`Transaction completed by ${JSON.stringify(data, null, 2)}`);
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
                window.location.assign("/your-error-page-here");
            },
            async createOrder() {
                try {
                    // const response = await fetch("/my-server/create-paypal-order", {
                    // 	method: "POST",
                    // 	headers: { "Content-Type": "application/json" },
                    // 	body: JSON.stringify({
                    // 		cart: [{ id: "YOUR_PRODUCT_ID", quantity: "YOUR_PRODUCT_QUANTITY" }],
                    // 	}),
                    // });

                    // const orderData = await response.json();

                    // if (!orderData.id) {
                    // 	const errorDetail = orderData.details[0];
                    // 	const errorMessage = errorDetail
                    // 		? `${errorDetail.issue} ${errorDetail.description} (${orderData.debug_id})`
                    // 		: "Unexpected error occurred, please try again.";

                    // 	throw new Error(errorMessage);
                    // }

                    return '';

                } catch (error) {
                    console.error(error);
                    throw error;
                }
            }
        }).render("#paypal-button-container");
    }
});

onMounted(async () => {
    try {


    } catch (error) {
        console.error("failed to load the PayPal JS SDK script", error);
    }

});


</script>

<style scoped></style>