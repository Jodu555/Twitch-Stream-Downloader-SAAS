<template>
  <div>
    <h1 class="text-center">Account</h1>
    <div>
      <ul class="d-flex justify-content-around nav nav-tabs">
        <li v-for="tab in tabs" :key="tab.name" :style="{ cursor: tab.disabled ? 'not-allowed' : 'pointer' }"
          class="nav-item">
          <NuxtLink :to="tab.route" class="nav-link" active-class="active">{{ tab.name }}</NuxtLink>
          <!-- <a class="nav-link" :class="{
            active: selectedTab == tab.name,
            disabled: tab.disabled,
          }" @click="selectedTab = tab.name" :aria-disabled="tab.disabled">{{ tab.name }}</a> -->
        </li>
      </ul>
    </div>
    <div class="tab-content">
      <div class="tab-pane fade active show">
        <NuxtPage />
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>

definePageMeta({
  middleware: 'auth',
  redirect: { path: '/account/infos' },
});

const tabs = [
  { name: 'Infos', disabled: false, route: '/account/infos' },
  { name: 'Invoices', disabled: false, route: '/account/invoices' },
  { name: 'Subscription Status', disabled: false, route: '/account/subscriptionStatus' },
  { name: 'Linked Accounts', disabled: false, route: '/account/linkedAccounts' },
] as { name: string, disabled: boolean; route: string; }[];

</script>

<style scoped></style>