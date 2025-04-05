<template>
    <div>
        <svg xmlns="http://www.w3.org/2000/svg" class="d-none">
            <symbol id="check2" viewBox="0 0 16 16">
                <path
                    d="M13.854 3.646a.5.5 0 0 1 0 .708l-7 7a.5.5 0 0 1-.708 0l-3.5-3.5a.5.5 0 1 1 .708-.708L6.5 10.293l6.646-6.647a.5.5 0 0 1 .708 0z" />
            </symbol>
        </svg>

        <svg xmlns="http://www.w3.org/2000/svg" class="d-none">
            <symbol id="check" viewBox="0 0 16 16">
                <title>Check</title>
                <path
                    d="M13.854 3.646a.5.5 0 0 1 0 .708l-7 7a.5.5 0 0 1-.708 0l-3.5-3.5a.5.5 0 1 1 .708-.708L6.5 10.293l6.646-6.647a.5.5 0 0 1 .708 0z" />
            </symbol>
        </svg>

        <header>
            <div class="d-flex flex-column flex-md-row align-items-center pb-3 mb-4 border-bottom">
                <a href="/" class="d-flex align-items-center link-body-emphasis text-decoration-none">
                    <svg xmlns="http://www.w3.org/2000/svg" width="40" height="32" class="me-2" viewBox="0 0 118 94"
                        role="img">
                        <title>Twitch Stream Recorder</title>
                        <path fill-rule="evenodd" clip-rule="evenodd"
                            d="M24.509 0c-6.733 0-11.715 5.893-11.492 12.284.214 6.14-.064 14.092-2.066 20.577C8.943 39.365 5.547 43.485 0 44.014v5.972c5.547.529 8.943 4.649 10.951 11.153 2.002 6.485 2.28 14.437 2.066 20.577C12.794 88.106 17.776 94 24.51 94H93.5c6.733 0 11.714-5.893 11.491-12.284-.214-6.14.064-14.092 2.066-20.577 2.009-6.504 5.396-10.624 10.943-11.153v-5.972c-5.547-.529-8.934-4.649-10.943-11.153-2.002-6.484-2.28-14.437-2.066-20.577C105.214 5.894 100.233 0 93.5 0H24.508zM80 57.863C80 66.663 73.436 72 62.543 72H44a2 2 0 01-2-2V24a2 2 0 012-2h18.437c9.083 0 15.044 4.92 15.044 12.474 0 5.302-4.01 10.049-9.119 10.88v.277C75.317 46.394 80 51.21 80 57.863zM60.521 28.34H49.948v14.934h8.905c6.884 0 10.68-2.772 10.68-7.727 0-4.643-3.264-7.207-9.012-7.207zM49.948 49.2v16.458H60.91c7.167 0 10.964-2.876 10.964-8.281 0-5.406-3.903-8.178-11.425-8.178H49.948z"
                            fill="currentColor"></path>
                    </svg>
                    <span class="fs-4">Twitch Stream Recorder</span>
                </a>

                <nav class="d-inline-flex mt-2 mt-md-0 ms-md-auto">
                    <a class="me-3 py-2 link-body-emphasis text-decoration-none" href="#">Home</a>
                    <a class="me-3 py-2 link-body-emphasis text-decoration-none" href="#">Pricing</a>
                    <a class="me-3 py-2 link-body-emphasis text-decoration-none" href="#">FAQ</a>
                </nav>
            </div>

            <div class="pricing-header p-3 pb-md-4 mx-auto text-center">
                <h1 class="display-4 fw-normal text-body-emphasis">Pricing</h1>
                <p class="fs-5 text-body-secondary">Quickly record and download Streams at the best possible Quality
                    completely Ad-Free and without any limits.
                    No muted or disabled VOD's! Just Record and Download!
                </p>
            </div>
        </header>

        <main>
            <div class="row row-cols-1 row-cols-md-3 mb-3 text-center">
                <div v-for="key in Object.keys(cardTable)" :key="key" class="col">
                    <div class="card mb-4 rounded-3 shadow-sm">
                        <div class="card-header py-3">
                            <h4 class="my-0 fw-normal" :class="{
                                [getRoleColor(key as PricingTableKey)]: true,
                            }">{{ keyToNiceName(key as PricingTableKey) }}</h4>
                        </div>
                        <div class="card-body">
                            <h1 class="card-title pricing-card-title">{{ cardTable[key as PricingTableKey].price
                            }}€<small class="text-body-secondary fw-light">/mo</small></h1>
                            <ul class="list-unstyled mt-3 mb-4">
                                <li v-for="feature in cardTable[key as PricingTableKey].features" :key="feature">{{
                                    feature }}</li>
                            </ul>
                            <button type="button" class="w-100 btn btn-lg btn-outline-primary">Sign up for free</button>
                        </div>
                    </div>
                </div>
            </div>

            <h2 class="display-6 text-center mb-4">Compare plans</h2>

            <div class="table-responsive">
                <table class="table text-center">
                    <thead>
                        <tr>
                            <th style="width: 34%;"></th>

                            <th style="width: 22%;" v-for="key in Object.keys(pricingTable)" :key="key" :class="{
                                [getRoleColor(key as PricingTableKey)]: true,
                            }">{{
                                keyToNiceName(key as PricingTableKey) }}</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="key in Object.keys(pricingTable['free'])" :key="key">
                            <th scope="row" class="text-start">{{ limitationToNiceName(key as keyof PricingTableObject)
                            }}
                            </th>
                            <td v-for="value in Object.keys(pricingTable)" :key="value">
                                <template v-if="getSub(value, key) === true">
                                    <svg class="bi" width="24" height="24">
                                        <use xlink:href="#check" />
                                    </svg>
                                </template>
                                <template v-else-if="getSub(value, key) === false">
                                </template>
                                <template v-else-if="value != 'free'">
                                    <b>{{ getSub(value, key) }}</b>
                                </template>
                                <template v-else>
                                    {{ getSub(value, key) }}
                                </template>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </main>
    </div>
</template>

<script lang="ts" setup>

import { cardTable, keyToNiceName, limitationToNiceName, type PricingTableKey, type PricingTableObject } from '~/utils/pricing';

const pricingTable = usePricingTable();

function getSub(value: string, key: string) {
    return pricingTable.value[value as PricingTableKey][key as keyof PricingTableObject];
}

</script>

<style scoped>
.container {
    max-width: 960px;
}

.pricing-header {
    max-width: 700px;
}

.bd-placeholder-img {
    font-size: 1.125rem;
    text-anchor: middle;
    -webkit-user-select: none;
    -moz-user-select: none;
    user-select: none;
}

@media (min-width: 768px) {
    .bd-placeholder-img-lg {
        font-size: 3.5rem;
    }
}

.b-example-divider {
    width: 100%;
    height: 3rem;
    background-color: rgba(0, 0, 0, .1);
    border: solid rgba(0, 0, 0, .15);
    border-width: 1px 0;
    box-shadow: inset 0 .5em 1.5em rgba(0, 0, 0, .1), inset 0 .125em .5em rgba(0, 0, 0, .15);
}

.b-example-vr {
    flex-shrink: 0;
    width: 1.5rem;
    height: 100vh;
}

.bi {
    vertical-align: -.125em;
    fill: currentColor;
}

.bd-mode-toggle {
    z-index: 1500;
}

.bd-mode-toggle .dropdown-menu .active .bi {
    display: block !important;
}
</style>