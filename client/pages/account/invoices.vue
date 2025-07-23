<template>
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
                    <td class="paypal-button-container" :id="`paypal-button-container-${invoice.ID}`" v-else>

                    </td>
                </tr>
            </tbody>
            <tfoot>

            </tfoot>
        </table>
    </div>
</template>

<script lang="ts" setup>
definePageMeta({
    middleware: 'auth',
});

import { loadScript } from "@paypal/paypal-js";

const globalStore = useGlobalStore();

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
                    }>("http://big.jodu555.de:8081/api/v1/paypal/captureOrder", {
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
                        }>("http://big.jodu555.de:8081/api/v1/paypal/createOrder", {
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