<template>
	<div>
		<pre>
			{{ { status, error } }}
		</pre>
		<div class="col-3" id="paypal-button-container"></div>
		<div class="py-3">
			<!-- <div class="row row-cols-1 row-cols-sm-3 row-cols-md-4 row-cols-xxl-5 gap-2"> -->




			<form @submit.prevent="startRecording" class="d-flex justify-content-center">


				<div class="col-5">
					<label for="twitchUsername" class="form-label">Twitch
						Username</label>
					<div class="input-group mb-3">
						<div class="input-group-text">
							<label class="form-check-label me-3" for="checkDefault">
								Watch Live
							</label>
							<input :disabled="startRecordingLoading" class="form-check-input mt-0"
								v-model="twitchRecordWatchLive" type="checkbox"
								aria-label="Checkbox for following text input">
						</div>
						<input :disabled="startRecordingLoading" type="text" v-model="twitchUsernameToRecord"
							class="form-control" id="twitchUsername" placeholder="Twitch Username"
							aria-label="Twitch Username">
						<button :disabled="startRecordingLoading" class="btn btn-primary" type="submit">
							<template v-if="!startRecordingLoading">
								Start Recording
							</template>
							<template v-else>
								<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
								Starting Recording...
							</template>
						</button>
						<!-- <button :disabled="startRecordingLoading" class="btn btn-outline-primary" type="submit">Start
							Recording</button> -->
					</div>
				</div>
			</form>

			<h1 class="text-center mt-2 mb-3">
				Recordings
			</h1>
			<!-- <div class="row">
				<div v-for="(streamer, idx) in streamers?.filter(x => x.state != 'FINISHED')" :key="streamer.id"
					class="col-4 card mb-3 p-2" :class="{ -->
			<div class="row row-cols-1 row-cols-lg-12 row-cols-md-12">
				<div v-for="(streamer, idx) in streamers?.filter(x => x.state != 'FINISHED')" :key="streamer.id"
					class="col-12 col-md-6 col-lg-4 card mb-3 p-2" :class="{
						'border-danger': streamer.state == 'RECORDING',
						'border-warning': streamer.state == 'TRANSCODING',
						'border-success': streamer.state == 'FINISHED',
					}">
					<!-- <pre>{{ streamer }}</pre> -->
					<div v-if="streamer.watchingLive || streamer.imageUrl" class="position-absolute"
						style="transform: translate(15%, 35%);">
						<div class="spinner-grow" :class="{
							'text-danger': streamer.state == 'RECORDING',
							'text-warning': streamer.state == 'TRANSCODING',
							'text-success': streamer.state == 'FINISHED',
						}" style="width: 3rem; height: 3rem;" role="status">
							<span class="visually-hidden">Live...</span>
						</div>
					</div>
					<template v-if="streamer.imageUrl">
						<img :src="streamer.imageUrl + '&auth-token=' + globalStore.auth.token"
							class="card-img-top py-2" alt="previewImage" />
					</template>
					<ClientOnly v-if="streamer.watchingLive && streamer.state == 'RECORDING'"
						fallback="Loading video...">
						<VideoPlayer class="card-img-top py-2"
							:link="`http://138.201.131.52:8081/api/v1/live/${streamer.id}/hls/master.m3u8`" />
					</ClientOnly>
					<div class="card-body">
						<span class="text-muted">Slot {{ idx + 1 }} / {{ userData.recordingSlots }}</span>
						<h1 class="card-title text-center" style="text-transform: capitalize;">{{
							streamer.twitchStreamerName }}</h1>
					</div>
					<ul v-if="streamer.ffmpegMetadata != null" class="list-group list-group-flush border-secondary">
						<li class="list-group-item"><b>Dauer:</b> {{ streamer.ffmpegMetadata.time }} / {{
							streamer.state
								== 'RECORDING' ?
								userData.maxRecordingTime + 'hrs' : streamer.videoMeta.time }}</li>
						<li class="list-group-item"><b>Größe:</b> {{
							bytesToHumanReadable(parseInt(streamer.ffmpegMetadata.size)) }}
						</li>
						<li class="list-group-item"><b>Geschwindigkeit:</b> {{ streamer.ffmpegMetadata.bitrate !==
							'0' ?
							streamer.ffmpegMetadata.bitrate :
							streamer.ffmpegMetadata.speed }}{{ streamer.ffmpegMetadata.bitrate !== '0' ? '' : 'x' }}
						</li>
						<li class="list-group-item"><b>Status:</b> {{ streamer.state }}</li>
					</ul>
					<div class="card-body">
						<div class="row justify-content-around">
							<ClientOnly>
								<!-- <span class="col-auto text-muted">Letzte Statistiken: {{ new
									Date(streamer.ffmpegMetadata.from).toLocaleTimeString('de') }}</span> -->
								<span v-if="streamer.ffmpegMetadata != null" class="col-auto text-muted">Letzte
									Statistiken:
									{{
										parseFloat(String(Math.abs(timestamp -
											streamer.ffmpegMetadata.from) / 1000)).toFixed(1)
									}}s</span>

								<!-- <span v-if="streamer.imageUrl" class="col-auto text-muted">Letztes Bild: {{ new
									Date(getLastImageTime(streamer.imageUrl)).toLocaleTimeString('de') }}</span> -->
								<span v-if="streamer.imageUrl" class="col-auto text-muted">Letztes Bild: {{
									parseFloat(String(Math.abs(timestamp -
										getLastImageTime(streamer.imageUrl)) / 1000)).toFixed(1)
								}}s</span>
							</ClientOnly>
						</div>
						<div class="row justify-content-around py-2">
							<a :href="`https://twitch.tv/${streamer.twitchStreamerName}`" target="_blank"
								class="col-4 btn btn-outline-info">Kanal</a>
							<button :disabled="streamer.state == 'TRANSCODING'" @click="stopRecording(streamer.id)"
								class="col-6 btn btn-outline-warning">
								Stop Recording
							</button>
						</div>
					</div>
				</div>
				<template v-if="(streamers?.length || 0) < userData.recordingSlots">
					<div v-for="idx in userData.recordingSlots - (streamers?.length || 0)" :key="idx"
						class="col-4 col-md-3 col-lg-3 card mb-3">
						<div class="card-body">
							<h1 class="card-title text-center" style="text-transform: capitalize;">Slot {{ idx +
								(streamers?.length || 0) }} /
								{{
									userData.recordingSlots }}</h1>
						</div>
					</div>
				</template>

				<div class="col-4 col-md-3 mb-3 card" v-if="globalStore.auth.user?.subscription_type != 'ADVANCED'">
					<!-- <pre>{{ sniffEntry }}</pre> -->
					<div class="card-body">
						<h1 class="card-title text-center" style="text-transform: capitalize;">Slot {{
							userData.recordingSlots }} / 🔒
						</h1>
						<div class="mt-4 d-grid gap-2">
							<NuxtLink to="/pricing" class="btn btn-outline-success">
								<span class="h4">Unlock more 🔓</span>
							</NuxtLink>
						</div>
					</div>
				</div>
			</div>

		</div>

	</div>
</template>

<script setup lang="ts">
definePageMeta({
	middleware: 'auth'
});


import { useTimestamp } from '@vueuse/core';


const startRecordingLoading = ref(false);
const twitchUsernameToRecord = ref('');
const twitchRecordWatchLive = ref(false);

const userData = computed(() => globalStore.auth.userData);



async function startRecording() {
	if (startRecordingLoading.value) {
		return;
	}
	startRecordingLoading.value = true;

	const { data: response, error } = await tryCatch($fetch(`http://138.201.131.52:8081/api/v1/records`, {
		method: 'POST',
		body: {
			name: twitchUsernameToRecord.value,
			watchLive: twitchRecordWatchLive.value,
		},
		headers: {
			'auth-token': globalStore.auth.token
		},
	}));

	if (error) {
		fetchErrorHandler(error, () => {
			// twitchUsernameToRecord.value = '';
			startRecordingLoading.value = false;
		});
		return;
	}


	console.log('Result', response);
	twitchUsernameToRecord.value = '';
	startRecordingLoading.value = false;
}

async function stopRecording(id: string) {
	const { data: response, error } = await tryCatch($fetch(`http://138.201.131.52:8081/api/v1/records/${id}/transcode`, {
		method: 'GET',
		headers: {
			'auth-token': globalStore.auth.token
		},
	}));
	if (error) {
		fetchErrorHandler(error, async () => {
			await refresh();
		});
		return;
	}
	await refresh();
}

function getLastImageTime(imageUrl: string) {
	const url = new URL(imageUrl);
	return parseInt(url.searchParams.get('time') ?? '0');
}

const globalStore = useGlobalStore();

const streamers = computed(() => globalStore.streamers);

const { error, refresh, status } = useAsyncData('streamers', globalStore.fetchStreamers);

const { timestamp, pause: pauseTimeStamp, resume: resumeTimeStamp } = useTimestamp({ offset: 0, controls: true });

const visibility = useDocumentVisibility();

watch(visibility, () => {
	console.log(visibility.value);
	if (visibility.value == 'visible') {
		resumeTimeStamp();
	} else {
		pauseTimeStamp();
	}
});


onMounted(async () => {
	// resumeStreamers();
	// resumeSniff();
});

// onUnmounted(() => {
// 	pauseStreamers();
// 	pauseSniff();
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

<style></style>