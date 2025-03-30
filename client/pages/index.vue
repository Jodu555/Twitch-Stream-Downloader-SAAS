<template>
	<div>
		<pre>
			{{ { status, error, sniffStatus, sniffError } }}
		</pre>
		<div class="py-3">
			<!-- <div class="row row-cols-1 row-cols-sm-3 row-cols-md-4 row-cols-xxl-5 gap-2"> -->
			<h1 class="text-center mt-2 mb-3">
				Recordings
			</h1>
			<div class="row gap-3">
				<div v-for="(streamer, idx) in streamers" :key="streamer.id" class="col-4 card" :class="{
					'border-danger': streamer.state == 'RECORDING',
					'border-warning': streamer.state == 'TRANSCODING',
					'border-success': streamer.state == 'FINISHED',
				}">

					<!-- <pre>{{ streamer }}</pre> -->
					<template v-if="streamer.imageUrl">
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
					</template>
					<div class="card-body">
						<span class="text-muted">Slot {{ idx + 1 }} / {{ userData.availableSlots }}</span>
						<h1 class="card-title text-center" style="text-transform: capitalize;">{{
							streamer.twitchStreamerName }}</h1>
					</div>
					<ul v-if="streamer.ffmpegMetadata != null" class="list-group list-group-flush border-secondary">
						<li class="list-group-item"><b>Dauer:</b> {{ streamer.ffmpegMetadata.time }} / {{
							userData.maxRecodingTime }}hrs</li>
						<li class="list-group-item"><b>Größe:</b> {{
							bytesToHumanReadable(parseInt(streamer.ffmpegMetadata.size)) }}
						</li>
						<li class="list-group-item"><b>Geschwindigkeit:</b> {{ streamer.ffmpegMetadata.bitrate }}</li>
						<li class="list-group-item"><b>Status:</b> {{ streamer.state }}</li>
					</ul>
					<div class="card-body">
						<div class="row justify-content-around">
							<span class="col-auto text-muted">Letzte Statistiken: {{ new
								Date(streamer.ffmpegMetadata.from).toLocaleTimeString('de') }}</span>
							<span v-if="streamer.imageUrl" class="col-auto text-muted">Letztes Bild: {{ new
								Date(getLastImageTime(streamer.imageUrl)).toLocaleTimeString('de') }}</span>
						</div>
						<div class="row justify-content-around py-2">
							<a :href="`https://twitch.tv/${streamer.twitchStreamerName}`" target="_blank"
								class="col-4 btn btn-outline-info">Kanal</a>
							<button :disabled="streamer.state == 'TRANSCODING'" class="col-6 btn btn-outline-warning">
								Test
							</button>
						</div>
					</div>
				</div>
				<template v-if="(streamers?.length || 0) < userData.availableSlots">
					<div v-for="idx in userData.availableSlots - (streamers?.length || 0)" :key="streamers?.length"
						class="col-3 card">
						<div class="card-body">
							<h1 class="card-title text-center" style="text-transform: capitalize;">Slot {{ idx + 1 }} /
								{{
									userData.availableSlots }}</h1>
						</div>
					</div>
				</template>

				<div class="col-3 card">
					<!-- <pre>{{ sniffEntry }}</pre> -->
					<div class="card-body">
						<h1 class="card-title text-center" style="text-transform: capitalize;">Slot {{
							userData.availableSlots }} / 🔒
						</h1>
						<div class="mt-4 d-grid gap-2">
							<button class="btn btn-outline-success">
								<span class="h4">Unlock more 🔓</span>
							</button>
						</div>
					</div>
				</div>
			</div>
			<h1 class="text-center mt-5 mb-3">
				Watching
			</h1>
			<div class="mt-5 row row-cols-1 row-cols-sm-3 row-cols-md-4 row-cols-xxl-5 gap-2">
				<div v-for="sniffEntry in sniffEntrys?.entrys" :key="sniffEntry.twitchStreamerName"
					class="col-sm-4 col-md-5">
					<div class="card">
						<!-- <pre>{{ sniffEntry }}</pre> -->
						<div class="card-body">
							<h1 class="card-title text-center" style="text-transform: capitalize;">{{
								sniffEntry.twitchStreamerName }}</h1>
						</div>
						<ul class="list-group list-group-flush border-secondary">

							<li v-if="sniffEntry.everyxMinute == 1" class="list-group-item"><b>Letzte Überprüfung
									vor:</b> {{
										getLastCheck(sniffEntry.lastCheck, true) }}s</li>
							<li v-else="sniffEntry.everyxMinute == 1" class="list-group-item"><b>Letzte Überprüfung
									vor:</b> {{
										getLastCheck(sniffEntry.lastCheck || 0, false) }}m</li>


							<li class="list-group-item"><b>Überprüfung alle:</b> {{ sniffEntry.everyxMinute }}
								Minuten
							</li>
							<li class="list-group-item" v-if="sniffEntry.everyxMinute !== 1">
								<button class="btn btn-outline-success">
									Upgrade 🚀
								</button>
							</li> <!-- <li class="list-group-item"><b>Geschwindigkeit:</b> {{ streamer.ffmpegMetadata.bitrate }}</li>
							<li class="list-group-item"><b>Status:</b> {{ streamer.state }}</li> -->
						</ul>
						<div class="card-body">
							<!-- <div class="row justify-content-around">
								<span class="col-auto text-muted">Letzte Überprüfung: {{ new
									Date(sniffEntrys?.lastCheck || 0).toLocaleTimeString('de') }}</span>
								<span class="col-auto text-muted">Überprüfung alle: {{ sniffEntry.everyxMinute }}
									Minuten</span>
							</div> -->

							<div class="row justify-content-around py-2 gap-2 p-1">
								<a :href="`https://twitch.tv/${sniffEntry.twitchStreamerName}`" target="_blank"
									class="col btn btn-outline-info">Kanal</a>

								<button class="col btn btn-outline-danger">
									Delete
								</button>
							</div>

						</div>
					</div>
				</div>
			</div>

		</div>

	</div>
</template>

<script setup lang="ts">

const userData = ref({
	availableSlots: 1,
	maxRecodingTime: 8,
});

import { useIntervalFn } from '@vueuse/core';

function getLastCheck(lastCheck: number, seconds: boolean) {
	let num = (new Date().getTime() - lastCheck) / 1000;
	if (!seconds)
		num = num / 60;
	return parseFloat(num.toString()).toFixed(1);
}

interface Streamer {
	id: string;
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
}

interface VideoMeta {
	time: string;
	size: string;
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

interface SniffEntry {
	twitchStreamerName: string;
	everyxMinute: number;
	users?: string[];
	lastCheck: number;
}

function getLastImageTime(imageUrl: string) {
	const url = new URL(imageUrl);
	return parseInt(url.searchParams.get('time') ?? '0');
}

const { data: streamers, error, refresh, status } = await useFetch<Streamer[]>('http://138.201.131.52:8081/api/v1/streamers');

const { data: sniffEntrys, error: sniffError, refresh: refreshSniffEntrys, status: sniffStatus } = await useFetch<{ lastCheck: number, entrys: SniffEntry[]; }>('http://138.201.131.52:8081/api/v1/sniffEntrys');

const visibility = useDocumentVisibility();

watch(visibility, () => {
	console.log(visibility.value);
	if (visibility.value == 'visible') {
		resumeStreamers();
		resumeSniff();
	} else {
		pauseStreamers();
		pauseSniff();
	}
});

const { pause: pauseStreamers, resume: resumeStreamers } = useIntervalFn(() => {
	console.log(`refreshing the data again ${new Date().toISOString()}`);
	refresh();
}, 1000);

const { pause: pauseSniff, resume: resumeSniff } = useIntervalFn(() => {
	console.log(`refreshing the sniffdata again ${new Date().toISOString()}`);
	refreshSniffEntrys();
}, 1000 * 10);


onMounted(() => {
	resumeStreamers();
	resumeSniff();
});

onUnmounted(() => {
	pauseStreamers();
	pauseSniff();
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