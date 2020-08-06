import {socket} from "./socket";

export default class WebRTCConnection {
    constructor({rtcConfig, remoteSocketId, outboundStream, inboundStream}) {
        this.pc = new RTCPeerConnection(rtcConfig);
        this.remoteSocketId = remoteSocketId;
        this.localClientIsInitiator = false;
        this.connected = false;
        this.outboundStream = outboundStream;
        this.inboundStream = inboundStream;

        this.pc.onicecandidate = event => {
            console.log('ice')
            if (event.candidate != null) {
                if (this.connected) {
                    socket.emit('candidate', {candidate: event.candidate, receiver: JSON.stringify(event.candidate)})
                } else {
                    // this.localIceCandidates.push(event.candidate);
                }
            }
        };

        this.pc.ontrack = event => {
            console.log('ontrack');
            this.inboundStream.addTrack(event.track, this.remoteSocketId);
        };

        this.pc.onaddstream = event => {
            console.log('onaddstream');
        }

        this.pc.oniceconnectionstatechange = event => {
            console.log('state change: ', this.pc.iceConnectionState);
            if (this.pc.iceConnectionState === 'failed') {
                this.pc.restartIce();
            }
        };

        this.pc.onconnectionstatechange = event => {
            console.log('connection state change: ', this.pc.connectionState);
        };

        this.pc.onsignalingstatechange = event => {
            // There is no ongoing exchange of offer and answer underway. This may mean that the RTCPeerConnection
            // object is new, in which case both the localDescription and remoteDescription are null; it may also
            // mean that negotiation is complete and a connection has been established.
            console.log('signaling state change ', this.pc.signalingState);
            if (this.pc.signalingState === 'stable') {
                this.outboundStream.getAudioTracks().forEach(track => {
                    this.pc.addTrack(track);
                });
            }
        };

        this.pc.onnegotiationneeded = async event => {
            console.log('negotiation needed')
            if (this.localClientIsInitiator) {
                this.createOffer();
            } else {
                socket.emit('ready', {receiver: this.remoteSocketId});
            }
        }

        this.outboundStream.getAudioTracks().forEach(track => this.pc.addTrack(track));
    }

    async createOffer() {
        const offer = await this.pc.createOffer({
            offerToReceiveAudio: true,
        });
        await this.pc.setLocalDescription(offer);
        console.log('sending offer ', this.pc.localDescription);
        socket.emit('offer', {offer: JSON.stringify(this.pc.localDescription), receiver: this.remoteSocketId});
    }
}
