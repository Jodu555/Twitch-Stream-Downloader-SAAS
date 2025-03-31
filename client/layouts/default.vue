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
					<ul class="navbar-nav">
						<li class="nav-item">
							<NuxtLink to="/" class="nav-link" active-class="active">Home</NuxtLink>
						</li>
						<li class="nav-item">
							<NuxtLink to="/" class="nav-link" active-class="active">View</NuxtLink>
						</li>
						<li class="nav-item">
							<NuxtLink to="/videos" class="nav-link position-relative" active-class="active">
								Videos
								<span
									class="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger">
									2
									<span class="visually-hidden">Open Videos</span>
								</span>
							</NuxtLink>
						</li>
						<li class="nav-item ms-3">
							<NuxtLink to="/pricing" class="nav-link" active-class="active">Pricing</NuxtLink>
						</li>
					</ul>
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

<script lang="ts" setup></script>

<style scoped></style>