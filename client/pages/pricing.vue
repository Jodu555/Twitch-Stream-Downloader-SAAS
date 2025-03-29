<template>
    <div>
        <svg xmlns="http://www.w3.org/2000/svg" class="d-none">
            <symbol id="check2" viewBox="0 0 16 16">
                <path
                    d="M13.854 3.646a.5.5 0 0 1 0 .708l-7 7a.5.5 0 0 1-.708 0l-3.5-3.5a.5.5 0 1 1 .708-.708L6.5 10.293l6.646-6.647a.5.5 0 0 1 .708 0z" />
            </symbol>
            <symbol id="circle-half" viewBox="0 0 16 16">
                <path d="M8 15A7 7 0 1 0 8 1v14zm0 1A8 8 0 1 1 8 0a8 8 0 0 1 0 16z" />
            </symbol>
            <symbol id="moon-stars-fill" viewBox="0 0 16 16">
                <path
                    d="M6 .278a.768.768 0 0 1 .08.858 7.208 7.208 0 0 0-.878 3.46c0 4.021 3.278 7.277 7.318 7.277.527 0 1.04-.055 1.533-.16a.787.787 0 0 1 .81.316.733.733 0 0 1-.031.893A8.349 8.349 0 0 1 8.344 16C3.734 16 0 12.286 0 7.71 0 4.266 2.114 1.312 5.124.06A.752.752 0 0 1 6 .278z" />
                <path
                    d="M10.794 3.148a.217.217 0 0 1 .412 0l.387 1.162c.173.518.579.924 1.097 1.097l1.162.387a.217.217 0 0 1 0 .412l-1.162.387a1.734 1.734 0 0 0-1.097 1.097l-.387 1.162a.217.217 0 0 1-.412 0l-.387-1.162A1.734 1.734 0 0 0 9.31 6.593l-1.162-.387a.217.217 0 0 1 0-.412l1.162-.387a1.734 1.734 0 0 0 1.097-1.097l.387-1.162zM13.863.099a.145.145 0 0 1 .274 0l.258.774c.115.346.386.617.732.732l.774.258a.145.145 0 0 1 0 .274l-.774.258a1.156 1.156 0 0 0-.732.732l-.258.774a.145.145 0 0 1-.274 0l-.258-.774a1.156 1.156 0 0 0-.732-.732l-.774-.258a.145.145 0 0 1 0-.274l.774-.258c.346-.115.617-.386.732-.732L13.863.1z" />
            </symbol>
            <symbol id="sun-fill" viewBox="0 0 16 16">
                <path
                    d="M8 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM8 0a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-1 0v-2A.5.5 0 0 1 8 0zm0 13a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-1 0v-2A.5.5 0 0 1 8 13zm8-5a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1 0-1h2a.5.5 0 0 1 .5.5zM3 8a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1 0-1h2A.5.5 0 0 1 3 8zm10.657-5.657a.5.5 0 0 1 0 .707l-1.414 1.415a.5.5 0 1 1-.707-.708l1.414-1.414a.5.5 0 0 1 .707 0zm-9.193 9.193a.5.5 0 0 1 0 .707L3.05 13.657a.5.5 0 0 1-.707-.707l1.414-1.414a.5.5 0 0 1 .707 0zm9.193 2.121a.5.5 0 0 1-.707 0l-1.414-1.414a.5.5 0 0 1 .707-.707l1.414 1.414a.5.5 0 0 1 0 .707zM4.464 4.465a.5.5 0 0 1-.707 0L2.343 3.05a.5.5 0 1 1 .707-.707l1.414 1.414a.5.5 0 0 1 0 .708z" />
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
                            <h4 class="my-0 fw-normal">{{ keyToNiceName(key as PricingTableKey) }}</h4>
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

                            <th style="width: 22%;" v-for="key in Object.keys(pricingTable)" :key="key">{{
                                keyToNiceName(key as PricingTableKey) }}</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="key in Object.keys(pricingTable['free'])" :key="key">
                            <th scope="row" class="text-start">{{ limitationToNiceName(key as keyof PricingTableObject)
                            }}
                            </th>
                            <td v-for="value in Object.keys(pricingTable)" :key="value">
                                <template
                                    v-if="pricingTable[value as PricingTableKey][key as keyof PricingTableObject] == true && pricingTable[value as PricingTableKey][key as keyof PricingTableObject] !== 1">
                                    <svg class="bi" width="24" height="24">
                                        <use xlink:href="#check" />
                                    </svg>
                                </template>
                                <template v-else-if="value != 'free'">
                                    <b>{{ pricingTable[value as PricingTableKey][key as keyof PricingTableObject] }}</b>
                                </template>
                                <template v-else>
                                    {{ pricingTable[value as PricingTableKey][key as keyof PricingTableObject] }}
                                </template>
                            </td>

                            <!-- <td><svg class="bi" width="24" height="24">
                                    <use xlink:href="#check" />
                                </svg></td>
                            <td>-->
                        </tr>
                    </tbody>
                </table>
            </div>
        </main>
    </div>
</template>

<script lang="ts" setup>

interface PricingTableObject {
    adFree: boolean;
    simulRecordings: number;
    staleVideos: number;
    maxRecordingTime: number;
    streamerCheckEvery: number;
    videoRetentionDays: number;
}

type PricingTableKey = 'free' | 'premium' | 'ultimate';

type PricingTable = Record<PricingTableKey, PricingTableObject>;

function keyToNiceName(key: PricingTableKey) {
    switch (key) {
        case 'free':
            return 'Free';
        case 'premium':
            return 'Premium';
        case 'ultimate':
            return 'Ultimate';
    }
}

function limitationToNiceName(key: keyof PricingTableObject) {
    switch (key) {
        case 'adFree':
            return 'Ad-Free';
        case 'simulRecordings':
            return 'Simul. Recordings';
        case 'staleVideos':
            return 'Stale Videos';
        case 'maxRecordingTime':
            return 'Max. Recording Time';
        case 'streamerCheckEvery':
            return 'Streamer Check Every Minutes';
        case 'videoRetentionDays':
            return 'Video Retention Days';
    }
}

type CardTable = Record<PricingTableKey, {
    price: number;
    features: string[];
}>;

const cardTable = ref<CardTable>({
    free: {
        price: 0,
        features: [
            'Completely Ad-Free',
            '1 Simultaneous Stream Recording',
            '2 Recorded Streams',
            '8 Hours Recording Time',
            '30 Minute Check for new Streams',
            '2 Days Video Retention',
        ],
    },
    premium: {
        price: 10,
        features: [
            'Completely Ad-Free',
            '5 Simultaneous Stream Recordings',
            '7 Recorded Streams',
            '24 Hours Recording Time',
            '1 Minute Check for new Streams',
            '7 Days Video Retention',
        ],
    },
    ultimate: {
        price: 25,
        features: [
            'Completely Ad-Free',
            '8 Simultaneous Stream Recordings',
            '20 Recorded Streams',
            '24 Hours Recording Time',
            '1 Minute Check for new Streams',
            '14 Days Video Retention',
        ],
    },
});

const pricingTable = ref<PricingTable>({
    free: {
        adFree: true,
        simulRecordings: 1,
        staleVideos: 2,
        maxRecordingTime: 8,
        streamerCheckEvery: 30,
        videoRetentionDays: 2,
    },
    premium: {
        adFree: true,
        simulRecordings: 5,
        staleVideos: 7,
        maxRecordingTime: 24,
        streamerCheckEvery: 1,
        videoRetentionDays: 7,
    },
    ultimate: {
        adFree: true,
        simulRecordings: 8,
        staleVideos: 20,
        maxRecordingTime: 24,
        streamerCheckEvery: 1,
        videoRetentionDays: 14,
    },
});

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