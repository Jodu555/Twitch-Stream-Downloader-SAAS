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

const video = ref<HTMLVideoElement>();
const hls = ref<Hls>();

const visibility = useDocumentVisibility();

watch(visibility, () => {
    const vid = video.value;
    if (!vid) return;
    if (!vid.muted) return;
    console.log(visibility.value);
    if (visibility.value == 'visible') {
        // hls.value?.to
        vid.play();
        hls.value?.resumeBuffering();
        vid.currentTime = vid.duration - 5;
    } else {
        vid.pause();
        hls.value?.pauseBuffering();
    }
});


onMounted(() => {
    prepareVideoPlayer();
});

onUpdated(() => {
    prepareVideoPlayer();
});

onUnmounted(() => {
    hls.value?.destroy();
});

function prepareVideoPlayer() {
    hls.value = new Hls();
    const stream = props.link;
    hls.value.loadSource(stream);
    if (video.value) {
        hls.value.attachMedia(video.value);
        hls.value.on(Hls.Events.MANIFEST_PARSED, () => {
            console.log('manifest parsed');
        });
        hls.value.on(Hls.Events.FRAG_LOADED, () => {
            console.log('fragment loaded');
        });
        hls.value.on(Hls.Events.ERROR, (event, data) => {
            console.log('error', event, data);
        });
    }
}

</script>

<style scoped></style>