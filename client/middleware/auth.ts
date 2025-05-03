export default defineNuxtRouteMiddleware(async (to, from) => {
    const globalStore = useGlobalStore();

    const authCookie = useCookie('auth-token');

    if (typeof authCookie.value != 'string' || authCookie.value == '') {
        return navigateTo('/login');
    }

    if (globalStore.auth.token == '') {
        globalStore.auth.token = authCookie.value.toString();
        await globalStore.authenticate();
        // return navigateTo('/login');
    }

    if (globalStore.auth.isAuthenticated == false) {
        console.log('User is not defined, trying to authenticate');
        await globalStore.authenticate();
        if (globalStore.auth.isAuthenticated == false) {
            console.log('User is still not defined, redirecting to login');
            return navigateTo('/login');
        }
    }

});