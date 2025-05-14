<template>
    <div>
        <ClientOnly>
            <Modal size="xl" v-model:show="showTitel">
                <template #title> Titles and Categories of the Stream from {{videos?.find(x => x.id ==
                    titleViewID)?.twitchStreamerName}}</template>
                <template #body>
                    <!-- <h5 class="text-center">Auto Generated Titles based on the stream ones</h5>
                        <div class="table-responsive-md">
                            <table class="table">
                                <thead>
                                    <tr>
                                        <th scope="col">Title</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr v-for="meta in videos?.find(x => x.id == titleViewID)?.metas" class="">
                                        <td>{{ meta.title }}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div> -->
                    <h5 class="text-center">Stream Titles</h5>
                    <div class="table-responsive-md">
                        <table class="table">
                            <thead>
                                <tr>
                                    <th scope="col">Time</th>
                                    <th scope="col" v-if="videos?.find(x => x.id == titleViewID)?.createdAt != null">
                                        Relative Time</th>
                                    <th scope="col">Title</th>
                                    <th scope="col">Category</th>
                                </tr>
                            </thead>
                            <tbody>
                                <template v-if="videos?.find(x => x.id == titleViewID)?.metas != null">
                                    <tr v-for="meta in videos?.find(x => x.id == titleViewID)?.metas" class="">
                                        <td scope="row">{{ new Date(meta.time).toLocaleString('de') }}</td>
                                        <td v-if="videos?.find(x => x.id == titleViewID)?.createdAt != null">{{
                                            secondsToHumanReadable((meta.time - (videos?.find(x => x.id ==
                                                titleViewID)?.createdAt || 0)) / 1000)
                                        }}</td>
                                        <td>{{ meta.title }}</td>
                                        <td>{{ meta.category }}</td>
                                    </tr>
                                </template>
                            </tbody>
                        </table>
                    </div>
                </template>
            </Modal>
        </ClientOnly>
        <pre>
    {{ { status, error } }}
</pre>
        <div class="py-3">
            <h1 class="text-center mt-2 mb-3">
                Videos
            </h1>
            <div class="row">
                <div v-for="(video, idx) in videos" :key="video.id" class="col-3 mb-3 card" :class="{
                    'border-danger': false,
                    'border-warning': false,
                    'border-success': false,
                }">
                    <div class="card-body">
                        <span class="text-muted">Slot {{ idx + 1 }} / {{ userData.videoSlots }}</span>
                        <h1 class="card-title text-center" style="text-transform: capitalize;">{{
                            video.twitchStreamerName }}</h1>
                    </div>
                    <ul v-if="video.videoMeta != null" class="list-group list-group-flush border-secondary">
                        <li class="list-group-item"><b>Dauer:</b> {{ video.videoMeta.time }} / {{
                            userData.maxRecordingTime }}hrs</li>
                        <li class="list-group-item"><b>Größe:</b> {{
                            bytesToHumanReadable(parseInt(video.videoMeta.size)) }}
                        </li>
                        <!-- <li class="list-group-item text-danger fw-bold"><b>Deletion:</b> {{
                            until(calcVideoDeletion(video)) }}
                        </li> -->
                        <li class="list-group-item text-danger fw-bold"><b>Deletion:</b> {{
                            countdown((calcVideoDeletion(video) - timestamp) / 1000)
                            }}</li>
                    </ul>
                    <div class="card-body">
                        <div class="row justify-content-around">
                            <span class="col-auto text-muted">Aufgenommen am: {{ new
                                Date(video.finishedAt).toLocaleString('de') }}</span>
                            <span class="col-auto text-warning fw-bold">Video löschung: {{ new
                                Date(calcVideoDeletion(video)).toLocaleString('de')
                            }}</span>
                        </div>
                        <div class="d-flex justify-content-between py-2">
                            <button class="col-7 btn btn-outline-secondary"
                                @click="showTitel = true; titleViewID = video.id">Titel & Kategorien</button>
                            <span class="col-4 text-info-emphasis text-center align-middle">Coming Soon</span>
                        </div>
                        <div class="d-flex justify-content-between py-2">
                            <button class="col-6 btn btn-outline-success">Herunterladen</button>
                            <button @click="deleteVideo(video.id)" class="col-4 btn btn-outline-danger">
                                Löschen
                            </button>
                        </div>
                        <div class="d-flex justify-content-end pt-1">
                            <span class="text-muted">ID: {{ video.id }}</span>
                        </div>
                    </div>
                </div>
                <template v-if="(videos?.length || 0) < userData.videoSlots">
                    <div v-for="idx in userData.videoSlots - (videos?.length || 0)" :key="idx" class="col-3 mb-3 card">
                        <div class="card-body">
                            <h1 class="card-title text-center" style="text-transform: capitalize;">Slot {{ idx +
                                (videos?.length || 0) }} /
                                {{
                                    userData.videoSlots }}</h1>
                        </div>
                    </div>
                </template>

                <div class="col-3 mb-3 card" v-if="globalStore.auth.user?.subscription_type != 'ADVANCED'">
                    <div class="card-body">
                        <h1 class="card-title text-center" style="text-transform: capitalize;">Slot {{
                            userData.videoSlots }} / 🔒
                        </h1>
                        <div class="mt-4 d-grid gap-2">
                            <button class="btn btn-outline-success">
                                <span class="h4">Unlock more 🔓</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>

    </div>
</template>

<script setup lang="ts">
import { useIntervalFn } from '@vueuse/core';

definePageMeta({
    middleware: 'auth'
});

const globalStore = useGlobalStore();
const userData = computed(() => globalStore.auth.userData);

const titleViewID = ref('');
const showTitel = ref(false);

const { timestamp, pause: pauseTimeStamp, resume: resumeTimeStamp } = useTimestamp({ offset: 0, controls: true, interval: 1000 });

function calcVideoDeletion(video: RecordedVideo) {
    return video.finishedAt + userData.value.videoRetentionDays * 24 * 60 * 60 * 1000;
    // return video.finishedAt + userData.videoRetentionDays * 24 * 60 * 60 * 1000;
}

function countdown(s: number) {
    // s = (s - Date.now()) / 1000;
    if (s < 0) {
        return 'Expired';
    }
    return 'in ' + secondsToDeletionString(s);
}


function intervalToLevels(interval: number, levels: { scale: number[], units: string[]; }) {
    const cbFun = (d: any, c: any) => {
        let bb = d[1] % c[0],
            aa = (d[1] - bb) / c[0];
        aa = aa > 0 ? aa + c[1] : '';

        return [d[0] + aa, bb];
    };

    let rslt = levels.scale.map((_, i, a) => a.slice(i).reduce((d, c) => d * c))
        .map((d, i) => ([d, levels.units[i]]))
        .reduce(cbFun, ['', interval]);
    return rslt[0];
};

const TimeLevels = {
    scale: [7, 24, 60, 60, 1],
    units: ['w ', 'd ', 'h ', 'm ', 's ']
};

function secondsToDeletionString(interval: number) {
    return intervalToLevels(interval, TimeLevels);
}

function secondsToHumanReadable(seconds: number) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const reseconds = Math.floor(seconds % 60);

    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${reseconds.toString().padStart(2, '0')}`;
}

function getLastCheck(lastCheck: number, seconds: boolean) {
    let num = (new Date().getTime() - lastCheck) / 1000;
    if (!seconds)
        num = num / 60;
    return parseFloat(num.toString()).toFixed(1);
}

async function deleteVideo(id: string) {
    const response = await $fetch(`http://138.201.131.52:8081/api/v1/videos/${id}`, {
        method: 'DELETE',
        headers: {
            'auth-token': globalStore.auth.token
        },
    });
    console.log(response);
    await refresh();
}

import { useTimeAgo } from '@vueuse/core';

function until(ms: number) {
    const timeAgo = useTimeAgo(new Date(ms));
    return timeAgo.value;
}

const videos = computed(() => globalStore.videos);
const { error, refresh, status } = useAsyncData('videos', globalStore.fetchVideos);

const visibility = useDocumentVisibility();

watch(visibility, () => {
    console.log(visibility.value);
    if (visibility.value == 'visible') {
        resumeTimeStamp();
    } else {
        pauseTimeStamp();
    }
});

function bytesToHumanReadable(size: number, breakSize = 1024) {
    let u = 0;
    while (size >= breakSize || -size >= breakSize) {
        size /= breakSize;
        u++;
    }
    return (u ? size.toFixed(1) + ' ' : size) + ' KMGTPEZY'[u] + 'B';
}

</script>