<template>
  <div class="d-flex justify-content-center align-items-center">
    <h1 class="text-success-emphasis mt-5">Successfully Authenticated</h1>
  </div>
  <div class="d-flex justify-content-center align-items-center">

    <h4>You can now close this window</h4>
  </div>
  <pre>{{ route.query }}</pre>
</template>

<script lang="ts" setup>
definePageMeta({
  middleware: 'auth',
  validate: async (route) => {
    return typeof route.query.code === 'string' && route.query.code.length > 0 && typeof route.query.scope === 'string';
  }
});

const route = useRoute();

const globalStore = useGlobalStore();

onMounted(async () => {

  const { code, scope } = route.query;

  if (typeof code === 'string') {
    const { data: response, error } = await tryCatch($fetch(`http://big.jodu555.de:8081/api/v1/youtube/callback?code=${code}&scope=${scope}`, {
      method: 'GET',
      headers: {
        'auth-token': globalStore.auth.token
      }
    }));

    if (error) {
      console.error(error);
      return;
    }
    console.log(response);
  }

})



</script>

<style scoped></style>