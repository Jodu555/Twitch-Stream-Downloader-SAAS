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
					<ItemCard class="col-5"></ItemCard>
					<!-- <ItemCard class="col-5"></ItemCard>
				<ItemCard class="col-5"></ItemCard>
				<ItemCard class="col-5"></ItemCard>
				<ItemCard class="col-5"></ItemCard> -->
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
		};
	},
	methods: {
		onAdd() {
			this.channelname;
		},
	},
};
</script>
<style lang=""></style>
