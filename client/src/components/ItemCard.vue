<template>
	<div class="card">
		<img v-if="imageurl" :src="imageurl" class="card-img-top py-2" alt="previewImage" />
		<div class="card-body">
			<h1 class="card-title text-center">{{ channelname }}</h1>
			<div class="row justify-content-around">
				<span v-if="lastStats" class="col-auto text-muted"
					>Last Stats: {{ new Date(lastStats).toLocaleTimeString() }}</span
				>
				<span v-if="lastImage" class="col-auto text-muted"
					>Last Image: {{ new Date(lastImage).toLocaleTimeString() }}</span
				>
			</div>
		</div>
		<ul v-if="stats != null" class="list-group list-group-flush">
			<li class="list-group-item"><b>Dauer:</b> {{ toNiceTime(stats.length) }}</li>
			<li class="list-group-item"><b>Größe:</b> {{ toNiceSize(stats.size) }}</li>
			<li class="list-group-item"><b>Geschwindigkeit:</b> {{ toNiceSize(stats.speed) }}/s</li>
			<li class="list-group-item"><b>Status:</b> Recording</li>
		</ul>
		<div class="card-body">
			<div class="row justify-content-around">
				<a href="https://twitch.tv/Sintica" class="col-4 btn btn-outline-info">Kanal</a>
				<a href="https://twitch.tv/Sintica" class="col-4 btn btn-outline-warning">Stop</a>
			</div>
		</div>
	</div>
</template>
<script>
export default {
	data() {
		return {
			stats: null,
			lastStats: null,
			imageurl: '',
			lastImage: null,
			channelname: 'Noname',
		};
	},
	created() {
		console.log('Component Created');
		this.$socket.on('imageChange', (data) => {
			this.imageurl = `http://localhost:3200/imgs/${this.channelname}.jpg?cacheKey=${Date.now()}`;
			this.lastImage = Date.now();
		});

		this.$socket.on('stats', (data) => {
			console.log('Got Stats-Update-Comp: ', data);
			this.stats = data;
			this.lastStats = Date.now();
		});

		this.$socket.on('name', (name) => {
			console.log('Go Name', name);
			this.channelname = name;
		});

		this.$socket.emit('initialInfos');
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
