<template>
    <div>
        <h2 class="text-center mt-3">Infos</h2>
        <div class="row">
            <div class="col-6 shadow-sm p-4 mb-5 rounded">
                <h3 class="text-left">Account Info</h3>
                <div class="mb-3 mt-3">
                    <label for="email" class="form-label">Email</label>
                    <input disabled type="email" class="form-control" id="email" aria-describedby="emailHelpId"
                        :value="globalStore.auth.user?.email" />
                </div>
                <div class="mb-3 mt-3">
                    <label for="subType" class="form-label">Subscription Type</label>
                    <input disabled type="text" class="form-control" id="subType"
                        :value="globalStore.auth.user?.subscription_type" />
                </div>

            </div>
            <div v-auto-animate class="col-6 shadow-sm p-4 mb-5 rounded">

                <h3 class="text-left">Notification Settings</h3>

                <!-- <pre>
                            {{ globalStore.auth.user?.notificationSettings }}
                        </pre> -->
                <div v-if="notificationSettings"
                    v-for="notificationId in Object.keys(notificationDescriptionLookup) as (keyof NotificationSettings)[]"
                    :key="notificationId" class="form-check form-switch">
                    <input class="form-check-input" type="checkbox" role="switch" :id="notificationId"
                        v-model="notificationSettings[notificationId]">
                    <label class="form-check-label" :for="notificationId">{{
                        notificationDescriptionLookup[notificationId]
                        }}</label>
                </div>
                <!-- <div v-for="notification in notificationSettings" :key="notification.id" class="form-check form-switch">
                    <input class="form-check-input" type="checkbox" role="switch" :id="notification.id"
                        v-model="notification.enabled">
                    <label class="form-check-label" :for="notification.id">{{ notification.description
                        }}</label>
                </div> -->
                <p class="text-success-emphasis h6 mt-3 neon-text" v-if="saved">Saved...</p>

            </div>
        </div>
    </div>
</template>

<script lang="ts" setup>
const globalStore = useGlobalStore();
definePageMeta({
    middleware: 'auth',
});



interface NotificationSettings {
    discountCode: boolean;
    videoDeletion: boolean;
    recordingStart: boolean;
    recordingFinished: boolean;
    openInvoice: boolean;
    invoiceDue: boolean;
}

const notificationSettings = computed(() => {
    return globalStore.auth.user?.notificationSettings;
});

const notificationDescriptionLookup: Record<keyof NotificationSettings, string> = {
    'discountCode': 'Send a notification when there is a new Discount code',
    'videoDeletion': 'Send a notification if a Video is about to be deleted',
    'recordingStart': 'Send a notification when a recording is automatically started',
    'recordingFinished': 'Send a notification when a recording is finished',
    'openInvoice': 'Send a notification when an Invoice is opened',
    'invoiceDue': 'Send a notification when an Invoice is due',
};

const saved = ref(false);
const savedTimeout = ref<NodeJS.Timeout>();

watchDeep(notificationSettings, async (newVal) => {
    if (saved.value == true) {
        clearTimeout(savedTimeout.value);
    }
    saved.value = true;

    const { data: response, error } = await tryCatch($fetch('http://138.201.131.52:8081/api/v1/auth/settings', {
        method: 'POST',
        headers: {
            'auth-token': globalStore.auth.token,
        },
        body: JSON.stringify(newVal),
    }));
    if (error) {
        fetchErrorHandler(error, async () => {
            saved.value = false;
        });
        return;
    }

    savedTimeout.value = setTimeout(() => {
        savedTimeout.value = undefined;
        saved.value = false;
    }, 2500);
})

</script>

<style scoped>
.neon-text {
    /* font-size: 4rem; */
    color: #fff;
    text-shadow: 0 0 10px #19962d, 0 0 20px #19962d, 0 0 40px #19962d, 0 0 80px #19962d, 0 0 160px #19962d;
    animation: glow 1s infinite alternate;
}

@keyframes glow {
    0% {
        text-shadow: 0 0 5px #00ff2a, 0 0 10px #00ff2a, 0 0 20px #00ff2a, 0 0 40px #00ff2a, 0 0 80px #00ff2a;
    }

    100% {
        text-shadow: 0 0 10px #19962d, 0 0 20px #19962d, 0 0 40px #19962d, 0 0 80px #19962d, 0 0 160px #19962d;
    }
}
</style>