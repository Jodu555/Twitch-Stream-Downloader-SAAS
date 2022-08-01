<template lang="">
	<div>
		<h1 class="text-center py-3">Home Page</h1>
		<div class="container">
			<form @submit.prevent="onAdd" class="row g-3 justify-content-center">
				<div class="col-auto">
					<label class="visually-hidden">Channelname</label>
					<input type="test" class="form-control" v-model="channelname" placeholder="Channelname" />
				</div>
				<div class="col-auto">
					<button type="submit" class="btn btn-primary mb-3">Add</button>
				</div>
			</form>
			<div class="py-3">
				<div class="row gap-2">
					<ItemCard v-for="[key, value] of items" class="col-5" :value="value"></ItemCard>
				</div>
			</div>
		</div>
	</div>
</template>
<script>
import ItemCard from '../components/ItemCard.vue';
export default {
	components: { ItemCard },
	data() {
		return {
			channelname: '',
			items: new Map(),
		};
	},
	created() {
		this.$socket.on('imageChange', ({ id }) => {
			if (!this.items.has(id)) this.items.set(id, {});
			const imageurl = `http://localhost:3200/imgs/${
				this.items.has(id) ? this.items.get(id).name : 'notfound'
			}.jpg?cacheKey=${Date.now()}`;
			this.items.set(id, { ...this.items.get(id), imageurl, lastImage: Date.now() });
		});

		this.$socket.on('stats', ({ id, ...data }) => {
			console.log('Got Stats-Update-Comp: ', id, data);
			if (!this.items.has(id)) this.items.set(id, {});

			this.items.set(id, { ...this.items.get(id), stats: data, lastStats: Date.now() });
		});

		this.$socket.on('infos', ({ id, name, state }) => {
			console.log('Got Name & state', name, state);
			if (this.items.has(id)) {
				this.items.set(id, { ...this.items.get(id), name, state });
			} else {
				this.items.set(id, { name });
			}
		});

		let disconn = false;

		this.$socket.on('disconnect', () => {
			this.items = new Map();
			disconn = true;
		});

		this.$socket.on('connect', () => {
			disconn && this.$socket.emit('initialInfos');
		});

		this.$socket.emit('initialInfos');
	},
	methods: {
		onAdd() {
			this.$socket.emit('download', { channelname: this.channelname });
			this.channelname = '';
		},
	},
};
</script>
<style lang=""></style>
