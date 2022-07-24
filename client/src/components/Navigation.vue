<template>
	<nav class="navbar navbar-expand-lg navbar-dark bg-dark">
		<div class="container-fluid">
			<router-link class="navbar-brand" to="/">Live Downloader</router-link>
			<button
				class="navbar-toggler"
				type="button"
				data-bs-toggle="collapse"
				data-bs-target="#navbarNav"
				aria-controls="navbarNav"
				aria-expanded="false"
				aria-label="Toggle navigation"
			>
				<span class="navbar-toggler-icon"></span>
			</button>
			<div class="collapse navbar-collapse" id="navbarNav">
				<ul class="navbar-nav me-auto mb-2 mb-lg-0">
					<li class="nav-item">
						<router-link class="nav-link" exact-active-class="active" to="/">Home</router-link>
					</li>
				</ul>
				<div v-if="loggedIn" class="d-flex">
					<div
						class="btn-group"
						style="margin-left: 4rem"
						role="group"
						aria-label="Basic outlined example"
					>
						<button class="btn btn-outline-danger" @click="logout()">Logout</button>
					</div>
				</div>
			</div>
		</div>
	</nav>
</template>

<script>
import { mapState, mapActions } from 'vuex';

export default {
	data() {
		return {
			ac: null,
		};
	},
	computed: {
		...mapState(['series']),
		...mapState('auth', ['loggedIn']),
	},
	methods: {
		...mapActions('auth', ['logout']),
	},
};
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped lang="scss"></style>
