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
            <div class="col-6 shadow-sm p-4 mb-5 rounded">
                <h3 class="text-left">Notification Settings</h3>
                <pre>
                            {{ globalStore.auth.user?.notificationSettings }}
                        </pre>
                <div v-for="notification in notificationSettings" :key="notification.id" class="form-check form-switch">
                    <input class="form-check-input" type="checkbox" role="switch" :id="notification.id"
                        v-model="notification.enabled">
                    <label class="form-check-label" :for="notification.id">{{ notification.description
                        }}</label>
                </div>

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

const userNotificationSettings: NotificationSettings = {
    discountCode: true,
    videoDeletion: true,
    recordingStart: true,
    recordingFinished: true,
    openInvoice: true,
    invoiceDue: true,
};

interface NotificationObject {
    id: keyof NotificationSettings;
    enabled: boolean;
    description: string;
}

const notificationSettings = computed(() => {
    return (Object.keys(userNotificationSettings) as (keyof NotificationSettings)[]).map(x => {
        return { id: x, enabled: userNotificationSettings[x], description: notificationDescriptionLookup[x] } satisfies NotificationObject;
    });
});

const notificationDescriptionLookup: Record<keyof NotificationSettings, string> = {
    'discountCode': 'Send a notification when there is a new Discount code',
    'videoDeletion': 'Send a notification if a Video is about to be deleted',
    'recordingStart': 'Send a notification when a recording is automatically started',
    'recordingFinished': 'Send a notification when a recording is finished',
    'openInvoice': 'Send a notification when an Invoice is opened',
    'invoiceDue': 'Send a notification when an Invoice is due',
};



</script>

<style scoped></style>