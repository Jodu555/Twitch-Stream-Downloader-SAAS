class TwitchDownload {
    constructor() {
        this.recordingProcess;
        this.renderingProcess;
        this.channel = 'Sintica';
    }

    loadFromID() {

    }

    emitStats() {

    }

    makeImage() {

    }

    startRecording() {
        const command = `streamlink --output "PATH/FILE.ts" twitch.tv/${this.channel} best`;
    }

    stopRecording() {

    }

    startRendering() {
        const command = `ffmpeg -i input.ts -c copy output.mp4`
    }




}