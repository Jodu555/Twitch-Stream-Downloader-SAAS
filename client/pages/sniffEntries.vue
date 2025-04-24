<template>

    <div class="py-3">
        <pre>{{ { sniffStatus, sniffError } }}</pre>
        <h1 class="text-center mt-5 mb-3">
            Monitoring
        </h1>
        <form @submit.prevent="addMonitoring()" class="d-flex justify-content-center">
            <div class="col-5">
                <label for="twitchUsernameMon" class="form-label">Twitch
                    Username</label>
                <div class="input-group mb-3">
                    <input type="text" v-model="twitchUsernameToMonitor" class="form-control" id="twitchUsernameMon"
                        placeholder="Twitch Username" aria-label="Twitch Username">
                    <button class="btn btn-outline-primary" type="submit">Add Monitoring</button>
                </div>
            </div>
        </form>
        <div class="mt-5 row row-cols-1 row-cols-sm-3 row-cols-md-4 row-cols-xxl-5 gap-2">
            <div v-for="(sniffEntry, idx) in sniffEntrys" :key="sniffEntry.twitchStreamerName"
                class="col-sm-4 col-md-5">
                <div class="card">
                    <!-- <pre>{{ sniffEntry }}</pre> -->
                    <div class="card-body">
                        <span class="text-muted">Slot {{ idx + 1 }} / {{ userData.streamerSlots }}</span>
                        <h1 class="card-title text-center" style="text-transform: capitalize;">{{
                            sniffEntry.twitchStreamerName }}</h1>
                    </div>
                    <ul class="list-group list-group-flush border-secondary">
                        <ClientOnly>
                            <!-- <li v-if="sniffEntry.everyxMinute == 1" class="list-group-item"><b>Letzte Überprüfung
									vor:</b> {{
										getLastCheck(undefined, sniffEntry.lastCheck, true) }}s</li>
							<li v-else="sniffEntry.everyxMinute == 1" class="list-group-item"><b>Letzte Überprüfung
									vor:</b> {{
										getLastCheck(undefined, sniffEntry.lastCheck || 0, false) }}m</li> -->
                            <li v-if="sniffEntry.everyxMinute == 1" class="list-group-item"><b>Letzte Überprüfung
                                    vor:</b> {{
                                        getLastCheck(timestamp, sniffEntry.lastCheck, true) }}s</li>
                            <li v-else="sniffEntry.everyxMinute == 1" class="list-group-item"><b>Letzte Überprüfung
                                    vor:</b> {{
                                        getLastCheck(timestamp, sniffEntry.lastCheck || 0, false) }}m</li>
                        </ClientOnly>


                        <li class="list-group-item"><b>Überprüfung alle:</b> {{ sniffEntry.everyxMinute }}
                            Minuten
                        </li>
                        <li class="list-group-item" v-if="sniffEntry.everyxMinute !== 1">
                            <button class="btn btn-outline-success">
                                Upgrade 🚀
                            </button>
                        </li>
                    </ul>
                    <div class="card-body">
                        <!-- <div class="row justify-content-around">
								<span class="col-auto text-muted">Letzte Überprüfung: {{ new
									Date(sniffEntrys?.lastCheck || 0).toLocaleTimeString('de') }}</span>
								<span class="col-auto text-muted">Überprüfung alle: {{ sniffEntry.everyxMinute }}
									Minuten</span>
							</div> -->

                        <div class="row justify-content-around py-2 gap-2 p-1">
                            <a :href="`https://twitch.tv/${sniffEntry.twitchStreamerName}`" target="_blank"
                                class="col btn btn-outline-info">Kanal</a>

                            <button @click="deleteMonitoringEntry(sniffEntry.twitchStreamerName)"
                                class="col btn btn-outline-danger">
                                Delete
                            </button>
                        </div>

                    </div>
                </div>
            </div>
            <template v-if="(sniffEntrys?.length || 0) < userData.streamerSlots">
                <div v-for="idx in userData.streamerSlots - (sniffEntrys?.length || 0)" :key="sniffEntrys?.length"
                    class="col-sm-4 col-md-5">
                    <div class="card">
                        <div class="card-body">
                            <h1 class="card-title text-center" style="text-transform: capitalize;">Slot {{ idx +
                                (sniffEntrys?.length || 0) }} /
                                {{
                                    userData.streamerSlots }}</h1>
                        </div>
                    </div>
                </div>
            </template>

            <div class="col-sm-4 col-md-5">
                <div class="card">
                    <div class="card-body">
                        <h1 class="card-title text-center" style="text-transform: capitalize;">Slot {{
                            userData.streamerSlots }} / 🔒
                        </h1>
                        <div class="mt-4 d-grid gap-2">
                            <button class="btn btn-outline-success">
                                <span class="h4">Unlock more 🔓</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script lang="ts" setup>

definePageMeta({
    middleware: 'auth'
});


const globalStore = useGlobalStore();
const twitchUsernameToMonitor = ref('');

const userData = useUserData();

const sniffEntrys = computed(() => globalStore.sniffEntrys);

const { error: sniffError, refresh: refreshSniffEntrys, status: sniffStatus } = useAsyncData('sniffEntrys', globalStore.fetchSniffEntrys);

async function addMonitoring() {
    const { data: response, error } = await tryCatch($fetch(`http://138.201.131.52:8081/api/v1/sniffEntrys/`, {
        method: 'POST',
        body: {
            twitchStreamerName: twitchUsernameToMonitor.value,
        },
    }));

    if (error) {
        console.log(error);
        return;
    }
    await refreshSniffEntrys();
    twitchUsernameToMonitor.value = '';
    console.log(response);
}

function getLastCheck(timestamp: number | undefined, lastCheck: number, seconds: boolean) {
    timestamp ??= Date.now();
    let num = (timestamp - lastCheck) / 1000;
    if (!seconds)
        num = num / 60;
    return parseFloat(Math.abs(num).toString()).toFixed(1);
}

async function deleteMonitoringEntry(name: string) {
    const { data: response, error } = await tryCatch($fetch(`http://138.201.131.52:8081/api/v1/sniffEntrys/${name}`, {
        method: 'DELETE',
    }));

    if (error) {
        console.log(error);
        return;
    }
    await refreshSniffEntrys();
    console.log(response);
}

const { timestamp, pause: pauseTimeStamp, resume: resumeTimeStamp } = useTimestamp({ offset: 0, controls: true });

const visibility = useDocumentVisibility();

watch(visibility, () => {
    console.log(visibility.value);
    if (visibility.value == 'visible') {
        resumeTimeStamp();
    } else {
        pauseTimeStamp();
    }
});


</script>

<style scoped></style>