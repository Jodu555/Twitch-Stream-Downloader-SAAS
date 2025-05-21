<template>
    <div>
        <h2 class="text-center mt-3">Subscription Status</h2>
        <div class="d-flex justify-content-between">
            <div class="card col-7">
                <div class="card-body">
                    <h5 class="card-title">Current Limits</h5>
                    <div class="mb-2" v-for="key in Object.keys(used)" :key="key">
                        <span>{{ limitationToNiceName(key as keyof
                            PricingTableObject) }}: {{ getHasHad(key).used }} / {{ getHasHad(key).has }}</span>
                        <div class="progress" role="progressbar" aria-label="Basic example" aria-valuenow="0"
                            aria-valuemin="0" aria-valuemax="100">
                            <div class="progress-bar" :style="{
                                width: `${calcWidth(key)}%`,
                            }">
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="card col-3 rounded-3 shadow-sm">
                <div class="card-body">
                    <h5 class="card-title">Current Subscription</h5>
                    <div class="card-header fw-normal py-3">
                        <h4 class="my-0" :class="{ [getRoleColor(globalStore.auth.user?.subscription_type!)]: true, }">
                            {{
                                keyToNiceName(globalStore.auth.user?.subscription_type!) }}</h4>
                    </div>
                    <ul class="mt-3 mb-4">
                        <li v-for="feature in cardTable[globalStore.auth.user?.subscription_type!].features"
                            :key="feature">
                            {{
                                feature }}</li>
                    </ul>
                    <div v-if="globalStore.auth.user?.subscription_type != 'ADVANCED'" class="d-grid gap-2">
                        <NuxtLink to="/pricing" type="button" class="btn btn-outline-success">
                            Upgrade
                        </NuxtLink>
                    </div>
                    <div v-if="globalStore.auth.user?.subscription_type != 'FREE'" class="d-grid gap-2 mt-4">
                        <NuxtLink to="/pricing" type="button" class="btn btn-outline-secondary">
                            Downgrade
                        </NuxtLink>
                    </div>
                </div>
            </div>

        </div>
    </div>
</template>

<script lang="ts" setup>

definePageMeta({
    middleware: 'auth',
});

const userData = computed(() => globalStore.auth.userData);

const globalStore = useGlobalStore();

const used = computed(() => {
    return {
        recordingSlots: globalStore.streamers.length,
        videoSlots: globalStore.videos.length,
        automationSlots: globalStore.automations.length,
    };
});

function getHasHad(key: string) {
    const hasused = ((used.value as any)[key]) as number;
    const has = userData.value[key as keyof PricingTableObject] as number;
    return { used: hasused, has };
}

function calcWidth(key: string) {
    const vals = getHasHad(key);
    return (vals.used / vals.has * 100).toFixed(2);
}
</script>

<style scoped></style>