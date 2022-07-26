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
        const command = `ffmpeg -sseof -3 -i file.ts -update 1 -q:v 1 imagename.jpg`;
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