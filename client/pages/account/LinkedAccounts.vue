<template>
    <div>
        <h2 class="text-center mt-3">Linked Accounts</h2>
        <div class="d-flex justify-content-center">
            <div class="col-6">
                <div class="d-grid gap-2">
                    <button type="button" @click="linkYoutubeAccount" class="btn btn-outline-warning">
                        Link A YouTube Account
                    </button>
                </div>
            </div>
        </div>

        <div class="list-group mt-4">
            <div v-for="linkedAccount in linkedAccounts"
                class="list-group-item list-group-item-action flex-column align-items-start">
                <div class="d-flex w-100 justify-content-between">
                    <h5 class="mb-1">{{ linkedAccount.youtubeChannelName }}</h5>
                    <small class="text-muted">Added {{ new
                        Date(parseInt(linkedAccount.created_at as any as string)).toLocaleDateString('de')
                        }}</small>
                </div>
                <p class="mb-1">Used in <strong>3 Automations</strong></p>

                <div class="d-flex justify-content-between">
                    <small class="text-muted">Playlist: <a href="#">*Klick*</a></small>
                    <button @click="unlinkYoutubekAccount(linkedAccount.youtubeAccountID)" type="button"
                        class="btn btn-outline-danger">
                        Unlink
                    </button>
                </div>

            </div>
        </div>
    </div>
</template>

<script lang="ts" setup>
definePageMeta({
    middleware: 'auth',
    redirect: { path: '/account/' }
});

const globalStore = useGlobalStore();

export interface LinkedAccount {
    userUUID: string;
    youtubeAccountID: string;
    refreshToken: string;
    expiresAt: number;
    youtubeChannelName?: string;
    created_at: number;
    updated_at: number;
}

const { status: linkedAccountsStatus, data: linkedAccounts, refresh } = useFetch<LinkedAccount[]>('http://big.jodu555.de:8081/api/v1/youtube/linkedAccounts', {
    headers: {
        'auth-token': globalStore.auth.token
    },
});


async function linkYoutubeAccount() {
    try {
        const { data: response, error } = await tryCatch($fetch<{
            authUrl: string;
        }>(`http://big.jodu555.de:8081/api/v1/youtube/getAuthURL`, {
            method: 'GET',
            headers: {
                'auth-token': globalStore.auth.token
            },
        }));
        if (error) {
            fetchErrorHandler(error, async () => {
                await refresh();
            });
            return;
        }

        // Open a popup window for authentication
        const authWindow = window.open(
            response.authUrl,
            'YouTube Authentication',
            'width=800,height=600'
        );

        // Monitor if window was closed without completing auth
        const checkClosed = setInterval(() => {
            if (authWindow?.closed) {
                clearInterval(checkClosed);
                // checkAuthStatus(); // Check if auth was successful
            }
        }, 1000);

    } catch (error) {
        console.error('Error initiating auth:', error);
        // setErrorMessage('Failed to start authentication process');
    }
}

async function unlinkYoutubekAccount(youtubeAccountID: string) {
    const { data: response, error } = await tryCatch($fetch(`http://big.jodu555.de:8081/api/v1/youtube/unlinkAccount?youtubeAccountID=${youtubeAccountID}`, {
        method: 'GET',
        headers: {
            'auth-token': globalStore.auth.token
        }
    }));
    if (error) {
        fetchErrorHandler(error, async () => {
            await refresh();
        });
        return;
    }
    console.log(response);
}

</script>

<style scoped></style>