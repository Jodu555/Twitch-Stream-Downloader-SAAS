<template>
	<div class="card">
		<img src="http://localhost:3200/imgs/basti.jpg" class="card-img-top" alt="..." />
		<div class="card-body">
			<h1 class="card-title">Sintica</h1>
		</div>
		<pre>{{ stats }}</pre>
		<ul class="list-group list-group-flush">
			<li class="list-group-item"><b>Dauer:</b> {{ toNiceTime(stats.length) }}</li>
			<li class="list-group-item"><b>Größe:</b> {{ toNiceSize(stats.size) }}</li>
			<li class="list-group-item"><b>Geschwindigkeit:</b> {{ toNiceSize(stats.speed) }}/s</li>
			<li class="list-group-item"><b>Status:</b> Recording</li>
		</ul>
		<div class="card-body">
			<a href="https://twitch.tv/Sintica" class="btn btn-outline-info">Kanal</a>
			<a href="https://twitch.tv/Sintica" class="btn btn-outline-warning">Stop</a>
		</div>
	</div>
</template>
<script>
export default {
	props: ['stats'],
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
