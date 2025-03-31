<template>
    <video ref="video" controls autoplay muted playsinline>
        <source :src="link" type="application/x-mpegURL" />
    </video>
</template>

<script lang="ts" setup>
import Hls from 'hls.js';

const props = defineProps<{
    link: string;
}>();

const video = ref(null);

onMounted(() => {
    prepareVideoPlayer();
});

onUpdated(() => {
    prepareVideoPlayer();
});

function prepareVideoPlayer() {
    let hls = new Hls();
    let stream = props.link;
    hls.loadSource(stream);
    if (video.value) {
        hls.attachMedia(video.value);
    }
}

</script>

<style scoped></style>