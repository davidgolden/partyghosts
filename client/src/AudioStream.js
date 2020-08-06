export default class AudioStream {
    constructor() {
        const container = document.getElementById('container');

        this.stream = new MediaStream();

        this.audioElement = document.createElement('audio');
        this.audioElement.setAttribute('autoplay', '');
        this.audioElement.setAttribute('style', "visibility: hidden");
        this.audioElement.srcObject = this.stream;

        container.appendChild(this.audioElement);

        this.tracks = {};
    }

    addTrack(track, remoteSocketId) {
        this.tracks[remoteSocketId] = track;
        this.stream.addTrack(track);
    }
}
