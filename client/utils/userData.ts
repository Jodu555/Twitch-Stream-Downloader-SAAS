export function useUserData() {
    const userData = ref<PricingTableObject>(usePricingTable().value.advanced);

    userData.value.videoRetentionDays = userData.value.videoRetentionDays - 2;

    return userData;
}