<template>
	<Navigation />
	<router-view />
</template>

<script>
import Navigation from './components/Navigation.vue';
export default {
	components: { Navigation },
};
</script>

<style lang="scss">
@import '../node_modules/bootstrap/scss/functions';
@import '../node_modules/bootstrap/scss/bootstrap';
</style>
