<template>
	<div>
		<pre>
			{{ { status, error } }}
		</pre>
		<div class="py-3">
			<div class="row gap-2">
				<div v-for="streamer in streamers" :key="streamer.id" class="col-5 card" :class="{
					'border-danger': streamer.state == 'RECORDING',
					'border-warning': streamer.state == 'TRANSCODING',
					'border-success': streamer.state == 'FINISHED',
				}">

					<pre>{{ streamer }}</pre>
					<div class="position-absolute translate-middle" style="transform: translate(15%, 35%);">
						<div class="spinner-grow" :class="{
							'text-danger': streamer.state == 'RECORDING',
							'text-warning': streamer.state == 'TRANSCODING',
							'text-success': streamer.state == 'FINISHED',
						}" style="width: 3rem; height: 3rem;" role="status">
							<span class="visually-hidden">Live...</span>
						</div>
					</div>
					<img v-if="streamer.imageUrl" :src="streamer.imageUrl" class="card-img-top py-2"
						alt="previewImage" />
					<div class="card-body">
						<h1 class="card-title text-center" style="text-transform: capitalize;">{{
							streamer.twitchStreamerName }}</h1>
					</div>
					<ul v-if="streamer.ffmpegMetadata != null" class="list-group list-group-flush border-secondary">
						<li class="list-group-item"><b>Dauer:</b> {{ streamer.ffmpegMetadata.time }}</li>
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
			</div>

		</div>

	</div>
</template>

<script setup lang="ts">

import { useIntervalFn } from '@vueuse/core';

const streamer = {
	"id": "2fvzpnfode4ipt6g3lugmn",
	"twitchStreamerName": "sintica",
	"metas": [
		{
			"title": "DÖNERSTAG - Besser spät als NIE! 🔥 | Harder Styles | !insta !holzkern !holy !madgaming !livefresh #Werbung",
			"category": "DJs",
			"time": 1743108348409
		}
	],
	"state": "RECORDING",
	"pid": 1173354,
	"ffmpegMetadata": {
		"frame": "719",
		"fps": "107",
		"size": "9216kB",
		"time": "00:00:12.01",
		"birate": "6285.7kbits/s",
		"speed": "1.79",
		"from": 1743108358632
	}
};
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

function getLastImageTime(imageUrl: string) {
	const url = new URL(imageUrl);
	return parseInt(url.searchParams.get('time') ?? '0');
}

const { data: streamers, error, refresh, status } = await useFetch<Streamer[]>('http://138.201.131.52:8081/api/v1/streamers');

useIntervalFn(() => {
	console.log(`refreshing the data again ${new Date().toISOString()}`);
	refresh(); // will call the 'todos' endpoint, just above
}, 1000); // call it back every 3s

function bytesToHumanReadable(size: number, breakSize = 1024) {
	let u = 0;
	while (size >= breakSize || -size >= breakSize) {
		size /= breakSize;
		u++;
	}
	return (u ? size.toFixed(1) + ' ' : size) + ' KMGTPEZY'[u] + 'B';
}

</script>