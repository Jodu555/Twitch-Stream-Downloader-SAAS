<template>

    <div class="py-3">
        <pre>{{ { automationStatus, automationError } }}</pre>
        <h1 class="text-center mt-5 mb-3">
            Automations
        </h1>
        <form @submit.prevent="addAutomation()" class="d-flex justify-content-center">
            <div class="col-5">
                <label for="twitchUsernameMon" class="form-label">Twitch
                    Username</label>
                <div class="input-group mb-3">
                    <input type="text" v-model="twitchUsernameToMonitor" class="form-control" id="twitchUsernameMon"
                        placeholder="Twitch Username" aria-label="Twitch Username">
                    <button class="btn btn-outline-primary" type="submit">Add Automation</button>
                </div>
            </div>
        </form>
        <div class="mt-5 row row-cols-1 row-cols-sm-3 row-cols-md-4 row-cols-xxl-5 gap-2">
            <div v-for="(automation, idx) in automations" :key="automation.twitchStreamerName"
                class="col-sm-4 col-md-5">
                <div class="card">
                    <!-- <pre>{{ sniffEntry }}</pre> -->
                    <div class="card-body">
                        <span class="text-muted">Slot {{ idx + 1 }} / {{ userData.automationSlots }}</span>
                        <h1 class="card-title text-center" style="text-transform: capitalize;">{{
                            automation.twitchStreamerName }}</h1>
                    </div>
                    <ul class="list-group list-group-flush border-secondary">
                        <ClientOnly>
                            <!-- <li v-if="sniffEntry.everyxMinute == 1" class="list-group-item"><b>Letzte Überprüfung
									vor:</b> {{
										getLastCheck(undefined, sniffEntry.lastCheck, true) }}s</li>
							<li v-else="sniffEntry.everyxMinute == 1" class="list-group-item"><b>Letzte Überprüfung
									vor:</b> {{
										getLastCheck(undefined, sniffEntry.lastCheck || 0, false) }}m</li> -->
                            <li v-if="automation.everyxMinute == 1" class="list-group-item"><b>Letzte Überprüfung
                                    vor:</b> {{
                                        getLastCheck(timestamp, automation.lastCheck, true) }}s</li>
                            <li v-else="sniffEntry.everyxMinute == 1" class="list-group-item"><b>Letzte Überprüfung
                                    vor:</b> {{
                                        getLastCheck(timestamp, automation.lastCheck || 0, false) }}m</li>
                        </ClientOnly>


                        <li class="list-group-item"><b>Überprüfung alle:</b> {{ automation.everyxMinute }}
                            Minuten
                        </li>
                        <li class="list-group-item" v-if="automation.everyxMinute !== 1">
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
                            <a :href="`https://twitch.tv/${automation.twitchStreamerName}`" target="_blank"
                                class="col btn btn-outline-info">Kanal</a>

                            <button @click="deleteAutomation(automation.twitchStreamerName)"
                                class="col btn btn-outline-danger">
                                Delete
                            </button>
                        </div>

                    </div>
                </div>
            </div>
            <template v-if="(automations?.length || 0) < userData.automationSlots">
                <div v-for="idx in userData.automationSlots - (automations?.length || 0)" :key="automations?.length"
                    class="col-sm-4 col-md-5">
                    <div class="card">
                        <div class="card-body">
                            <h1 class="card-title text-center" style="text-transform: capitalize;">Slot {{ idx +
                                (automations?.length || 0) }} /
                                {{
                                    userData.automationSlots }}</h1>
                        </div>
                    </div>
                </div>
            </template>

            <div class="col-sm-4 col-md-5">
                <div class="card">
                    <div class="card-body">
                        <h1 class="card-title text-center" style="text-transform: capitalize;">Slot {{
                            userData.automationSlots }} / 🔒
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

const automations = computed(() => globalStore.automations);

const { error: automationError, refresh: refreshAutomations, status: automationStatus } = useAsyncData('automations', globalStore.fetchAutomations);

async function addAutomation() {
    const { data: response, error } = await tryCatch($fetch(`http://138.201.131.52:8081/api/v1/automations/`, {
        method: 'POST',
        headers: {
            'auth-token': globalStore.auth.token
        },
        body: {
            twitchStreamerName: twitchUsernameToMonitor.value,
        },
    }));

    if (error) {
        console.log(error);
        return;
    }
    await refreshAutomations();
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

async function deleteAutomation(name: string) {
    const { data: response, error } = await tryCatch($fetch(`http://138.201.131.52:8081/api/v1/sniffEntrys/${name}`, {
        method: 'DELETE',
    }));

    if (error) {
        console.log(error);
        return;
    }
    await refreshAutomations();
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