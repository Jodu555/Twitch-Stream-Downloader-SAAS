<template>
	<div class="card">
		<pre>{{ value }}</pre>
		<img v-if="value.imageurl" :src="value.imageurl" class="card-img-top py-2" alt="previewImage" />
		<div class="card-body">
			<h1 class="card-title text-center">{{ value.name }}</h1>
			<div class="row justify-content-around">
				<span v-if="value.lastStats" class="col-auto text-muted"
					>Letzte Statistiken: {{ new Date(value.lastStats).toLocaleTimeString() }}</span
				>
				<span v-if="value.lastImage" class="col-auto text-muted"
					>Letztes Bild: {{ new Date(value.lastImage).toLocaleTimeString() }}</span
				>
			</div>
		</div>
		<ul v-if="value.stats != null" class="list-group list-group-flush">
			<li class="list-group-item"><b>Dauer:</b> {{ toNiceTime(value.stats.length) }}</li>
			<li class="list-group-item"><b>Größe:</b> {{ toNiceSize(value.stats.size) }}</li>
			<li class="list-group-item"><b>Geschwindigkeit:</b> {{ toNiceSize(value.stats.speed) }}/s</li>
			<li class="list-group-item"><b>Status:</b> Recording</li>
		</ul>
		<div class="card-body">
			<div class="row justify-content-around">
				<a
					:href="`https://twitch.tv/${value.name}`"
					target="_blank"
					class="col-4 btn btn-outline-info"
					>Kanal</a
				>
				<a href="https://twitch.tv/Sintica" class="col-4 btn btn-outline-warning">Stop</a>
			</div>
		</div>
	</div>
</template>
<script>
export default {
	props: ['value'],
	created() {
		console.log('Component Created');
	},
	methods: {
		toNiceTime(seconds) {
			const date = new Date(0);
			date.setSeconds(seconds);
			return date.toISOString().substr(11, 8);
		},

		toNiceSize(fileSizeInBytes) {
			var i = -1;
			var byteUnits = [' kB', ' MB', ' GB', ' TB', 'PB', 'EB', 'ZB', 'YB'];
			do {
				fileSizeInBytes = fileSizeInBytes / 1024;
				i++;
			} while (fileSizeInBytes > 1024);

			return Math.max(fileSizeInBytes, 0.01).toFixed(2) + byteUnits[i];
		},
	},
};
</script>
<style lang=""></style>
