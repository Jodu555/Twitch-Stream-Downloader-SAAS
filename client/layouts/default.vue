<template>
	<header>
		<nav class="navbar navbar-expand-lg bg-body-tertiary">
			<div class="container-fluid">
				<a class="navbar-brand" href="#">TwitchStreamRecorder</a>
				<button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav"
					aria-controls="navbarNav" aria-expanded="false" aria-label="Toggle navigation">
					<span class="navbar-toggler-icon"></span>
				</button>
				<div class="collapse navbar-collapse" id="navbarNav">
					<ul class="navbar-nav me-auto">
						<li class="nav-item">
							<NuxtLink to="/" class="nav-link" active-class="active">Home</NuxtLink>
						</li>
						<li class="nav-item">
							<NuxtLink to="/automations" class="nav-link" active-class="active">Automations</NuxtLink>
						</li>
						<li class="nav-item">
							<NuxtLink to="/videos" class="nav-link position-relative" active-class="active">
								Videos
								<ClientOnly>
									<span v-if="globalStore.videos.length > 0"
										class="position-absolute top-5 start-100 translate-middle badge rounded-pill bg-danger">
										{{ globalStore.videos.length }}
										<span class="visually-hidden">Open Videos</span>
									</span>
								</ClientOnly>
							</NuxtLink>
						</li>
						<li class="nav-item" :class="{
							'ms-3': globalStore.videos.length > 0,
						}">
							<NuxtLink to="/pricing" class="nav-link" active-class="active">Pricing</NuxtLink>
						</li>
					</ul>
					<div class="d-flex" v-if="globalStore.auth.isAuthenticated">
						<div class="nav-item">
							<NuxtLink to="/account" class="align-middle text-center" active-class="active">Account
							</NuxtLink>
						</div>
						<button @click="globalStore.logout" type="button" class="ms-2 btn btn-outline-danger">
							Logout
						</button>

						<!-- <div class="nav-item">
							<NuxtLink to="/account" class="nav-link">Account</NuxtLink>
						</div> -->
					</div>
				</div>
			</div>
		</nav>
	</header>
	<main class="container-xxl">
		<slot />
	</main>
	<footer>
		<!-- place footer here -->
	</footer>
</template>

<script lang="ts" setup>

const globalStore = useGlobalStore();
const authToken = useCookie('auth-token');

watch(
	authToken, (newValue) => {
		if (newValue) {
			connectSocket();
		} else {
			useSocket()?.disconnect();
			console.log('No auth token found');
		}
	}, { immediate: true });

function connectSocket() {
	const socket = useSocket();

	if (socket.connected) return;

	socket.auth = { type: 'client', token: authToken.value };
	socket.connect();

	socket.on('connect', () => {
		console.log('Socket connected');
		fetchAll();
	});

	socket.on('disconnect', () => {
		console.log('Socket disconnected');
	});

	socket.on('error', (err) => {
		console.log('Socket error', err);
	});

	socket.on('recordingUpdate', ({ ID, data: obj }) =>
		globalStore.onRecordingUpdate(ID, obj)
	);

	socket.on('automationUpdate', async ({ streamer, data: obj }) =>
		globalStore.onAutomationUpdate(streamer, obj)
	);

	socket.on('automationDeletion', ({ streamer }) =>
		globalStore.onAutomationDeletion(streamer)
	);

	socket.on('videoUpdate', ({ ID, data: obj }) =>
		globalStore.onVideoUpdate(ID, obj)
	);

	socket.on('videoDeletion', ({ ID }) =>
		globalStore.onVideoDeletion(ID)
	);
}

onMounted(() => {
	if (!authToken.value) {
		console.log('No auth token found');
		return;
	}
	connectSocket();
});

async function fetchAll(once: boolean = false) {
	if (!globalStore.auth.isAuthenticated) {
		await globalStore.authenticate();
		return;
	}
	if (once) {
		await Promise.all([
			callOnce(globalStore.fetchStreamers),
			callOnce(globalStore.fetchAutomations),
			callOnce(globalStore.fetchVideos),
			callOnce(globalStore.fetchInvoices),
		]);
	} else {
		await Promise.all([
			globalStore.fetchStreamers,
			globalStore.fetchAutomations,
			globalStore.fetchVideos,
			globalStore.fetchInvoices,
		]);
	}
}

fetchAll(true);

// await callOnce(globalStore.fetchStreamers);
// await callOnce(globalStore.fetchSniffEntrys);
// await callOnce(globalStore.fetchVideos);

</script>

<style scoped></style>