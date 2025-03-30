<template>
    <div>
        <pre>
			<!-- {{ { status, error, sniffStatus, sniffError } }} -->
		</pre>
        <div class="py-3">
            <!-- <div class="row row-cols-1 row-cols-sm-3 row-cols-md-4 row-cols-xxl-5 gap-2"> -->
            <h1 class="text-center mt-2 mb-3">
                Videos
            </h1>
            <div class="row gap-3">
                <div v-for="(video, idx) in videos" :key="video.id" class="col-4 card" :class="{
                    'border-danger': false,
                    'border-warning': false,
                    'border-success': false,
                }">

                    <!-- <pre>{{ streamer }}</pre> -->
                    <!-- <template v-if="streamer.imageUrl">
                        <div class="position-absolute" style="transform: translate(15%, 35%);">
                            <div class="spinner-grow" :class="{
                                'text-danger': streamer.state == 'RECORDING',
                                'text-warning': streamer.state == 'TRANSCODING',
                                'text-success': streamer.state == 'FINISHED',
                            }" style="width: 3rem; height: 3rem;" role="status">
                                <span class="visually-hidden">Live...</span>
                            </div>
                        </div>
                        <img :src="streamer.imageUrl" class="card-img-top py-2" alt="previewImage" />
                    </template> -->
                    <div class="card-body">
                        <span class="text-muted">Slot {{ idx + 1 }} / {{ userData.recordingSlots }}</span>
                        <h1 class="card-title text-center" style="text-transform: capitalize;">{{
                            video.twitchStreamerName }}</h1>
                    </div>
                    <ul v-if="video.ffmpegMetadata != null" class="list-group list-group-flush border-secondary">
                        <li class="list-group-item"><b>Dauer:</b> {{ video.ffmpegMetadata.time }} / {{
                            userData.maxRecordingTime }}hrs</li>
                        <li class="list-group-item"><b>Größe:</b> {{
                            bytesToHumanReadable(parseInt(video.ffmpegMetadata.size)) }}
                        </li>
                        <li class="list-group-item text-danger fw-bold"><b>Deletion:</b> {{ until(video.recordedAt
                            +
                            userData.videoRetentionDays * 24 * 60 *
                            60 * 1000) }}</li>
                        <!-- <li class="list-group-item"><b>Status:</b> {{ video.state }}</li> -->
                    </ul>
                    <div class="card-body">
                        <div class="row justify-content-around">
                            <span class="col-auto text-muted">Aufgenommen am: {{ new
                                Date(video.recordedAt).toLocaleString('de') }}</span>
                            <span class="col-auto text-muted">Video löschung: {{ new
                                Date(video.recordedAt + userData.videoRetentionDays * 24 * 60 * 60 *
                                    1000).toLocaleString('de')
                            }}</span>
                        </div>
                        <div class="row justify-content-around py-2">
                            <a :href="`https://twitch.tv/${video.twitchStreamerName}`" target="_blank"
                                class="col-4 btn btn-outline-info">Kanal</a>
                            <button class="col-6 btn btn-outline-warning">
                                Test
                            </button>
                        </div>
                    </div>
                </div>
                <template v-if="(videos.length || 0) < userData.videoSlots">
                    <div v-for="idx in userData.recordingSlots - (videos?.length || 0)" :key="videos?.length"
                        class="col-3 card">
                        <div class="card-body">
                            <h1 class="card-title text-center" style="text-transform: capitalize;">Slot {{ idx +
                                (videos.length || 0) }} /
                                {{
                                    userData.recordingSlots }}</h1>
                        </div>
                    </div>
                </template>

                <div class="col-3 card">
                    <!-- <pre>{{ sniffEntry }}</pre> -->
                    <div class="card-body">
                        <h1 class="card-title text-center" style="text-transform: capitalize;">Slot {{
                            userData.recordingSlots }} / 🔒
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
import { useUserData } from '~/utils/userData';

const userData = useUserData();


function getLastCheck(lastCheck: number, seconds: boolean) {
    let num = (new Date().getTime() - lastCheck) / 1000;
    if (!seconds)
        num = num / 60;
    return parseFloat(num.toString()).toFixed(1);
}

const videos = ref<RecordedVideo[]>([
    {
        id: '1',
        recordedAt: Date.now() - 1000 * 60 * 60 * 24,
        twitchStreamerName: 'Jodu',
        ffmpegMetadata: {
            time: '07:00:00',
            size: (15 * 1024 ** 3).toString(),
            bitrate: '0',
            speed: '0',
            frame: '0',
            fps: '0',
            from: Date.now() - 1000 * 60 * 60 * 24,
        },
        metas: [
            {
                title: 'Test',
                category: 'Test',
                time: Date.now() - 1000,
            },
        ],
    }
]);

interface RecordedVideo {
    id: string;
    recordedAt: number;
    twitchStreamerName: string;
    metas: MetaRepresent[];
    ffmpegMetadata?: FfmpegMetadata;
}

interface MetaRepresent {
    title: string;
    category: string;
    time: number;
}

interface FfmpegMetadata {
    frame: string;
    fps: string;
    size: string;
    time: string;
    bitrate: string;
    speed: string;
    from: number;
}

import { useTimeAgo } from '@vueuse/core';


function until(ms: number) {
    const timeAgo = useTimeAgo(new Date(ms));
    return timeAgo.value;
}

// const visibility = useDocumentVisibility();

// watch(visibility, () => {
//     console.log(visibility.value);
//     if (visibility.value == 'visible') {
//         resumeStreamers();
//         resumeSniff();
//     } else {
//         pauseStreamers();
//         pauseSniff();
//     }
// });

// const { pause: pauseStreamers, resume: resumeStreamers } = useIntervalFn(() => {
//     console.log(`refreshing the data again ${new Date().toISOString()}`);
//     // refresh();
// }, 1000);

// const { pause: pauseSniff, resume: resumeSniff } = useIntervalFn(() => {
//     console.log(`refreshing the sniffdata again ${new Date().toISOString()}`);
//     // refreshSniffEntrys();
// }, 1000 * 10);


// onMounted(() => {
//     resumeStreamers();
//     resumeSniff();
// });

// onUnmounted(() => {
//     pauseStreamers();
//     pauseSniff();
// });

function bytesToHumanReadable(size: number, breakSize = 1024) {
    let u = 0;
    while (size >= breakSize || -size >= breakSize) {
        size /= breakSize;
        u++;
    }
    return (u ? size.toFixed(1) + ' ' : size) + ' KMGTPEZY'[u] + 'B';
}

</script>