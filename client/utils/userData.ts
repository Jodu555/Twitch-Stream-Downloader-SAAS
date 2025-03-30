export function useUserData() {
    const userData = ref<PricingTableObject>(usePricingTable().value.premium);

    userData.value.videoRetentionDays = userData.value.videoRetentionDays - 4;

    return userData;
}