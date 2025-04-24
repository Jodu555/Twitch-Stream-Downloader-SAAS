export default defineNuxtRouteMiddleware(async (to, from) => {
    const globalStore = useGlobalStore();

    if (globalStore.auth.token == undefined) {
        return navigateTo('/login');
    }

    console.log('USER', JSON.stringify(globalStore.auth), typeof globalStore.auth.user);

    if (globalStore.auth.isAuthenticated == false) {
        console.log('User is not defined, trying to authenticate');
        await globalStore.authenticate();
        if (globalStore.auth.isAuthenticated == false) {
            console.log('User is still not defined, redirecting to login');
            return navigateTo('/login');
        }
    }

});