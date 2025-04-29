export function useUserData() {
    const globalStore = useGlobalStore();
    const userData = ref<PricingTableObject>(usePricingTable().value[globalStore.auth.user?.subscription_type.toLowerCase() as PricingTableKey]);

    return userData;
}