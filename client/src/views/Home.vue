<template lang="">
	<div>
		<h1 class="text-center py-3">Home Page</h1>
		<div class="container py-5">
			<div class="row gap-2">
				<ItemCard class="col-5"></ItemCard>
				<!-- <ItemCard class="col-5"></ItemCard>
				<ItemCard class="col-5"></ItemCard>
				<ItemCard class="col-5"></ItemCard>
				<ItemCard class="col-5"></ItemCard> -->
			</div>
		</div>
	</div>
</template>
<script>
import ItemCard from '../components/ItemCard.vue';
export default {
	components: { ItemCard },
};
</script>
<style lang=""></style>
