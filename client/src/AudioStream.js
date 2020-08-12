export default class AudioStream {
    constructor() {
        this.stream = new MediaStream();

        this.audioElement = document.getElementById('inboundAudio');

        this.audioElement.srcObject = this.stream;

        this.tracks = {};
    }

    addTrack(track, remoteSocketId) {
        this.tracks[remoteSocketId] = track;
        this.stream.addTrack(track);
    }
}
