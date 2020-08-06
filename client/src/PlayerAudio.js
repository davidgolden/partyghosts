import {socket} from "./socket";
import WebRTCConnection from "./WebRTCConnection";
import AudioStream from "./AudioStream";

export default class PlayerAudio {
    constructor(data) {
        this.localSocketId = null
        this.iceServers = null;
        this.peers = {};
        this.localIceCandidates = [];
        this.localAudioSender = null;

        this.handleInit(data);
    }

    handleInit = async (data) => {
        this.inboundStream = new AudioStream();
        this.outboundStream = await navigator.mediaDevices.getUserMedia({audio: true, video: false});

        // get all the initial data about the current room and local client's role
        this.localSocketId = data.socketId;
        this.iceServers = JSON.parse(data.iceServers);

        // once we have iceServers, we can establish a new connection
        for (let k in data.nodes) {
            if (data.nodes.hasOwnProperty(k) && k !== this.localSocketId) {
                const connection = await this.establishConnection(k);
                // when a new connection is established, the local client becomes the initiator for every current peer
                connection.localClientIsInitiator = true;
            }
        }

        socket.on('offer', this.handleOffer);
        socket.on('answer', this.handleAnswer);
        socket.on('disconnection', this.handleDisconnection);
        socket.on('candidate', this.handleCandidate);
        socket.on('ready', this.handleReadyForOffer);
    }

    handleReadyForOffer = async ({sender}) => {
        if (!this.peers[sender]) await this.establishConnection(sender);

        this.peers[sender].createOffer();
    }

    handleOffer = async ({offer, sender}) => {
        try {
            console.log('received offer');
            const RTCDescription = new RTCSessionDescription(JSON.parse(offer));

            if (!this.peers[sender]) await this.establishConnection(sender);

            const peerConnection = this.peers[sender].pc;

            await peerConnection.setRemoteDescription(RTCDescription);

            // if (peerConnection.signalingState !== 'have-remote-offer' && peerConnection.signalingState !== 'have-local-pranswer') return;

            const answer = await peerConnection.createAnswer({
                offerToReceiveAudio: true,
            });
            await peerConnection.setLocalDescription(answer);

            socket.emit('answer', {answer: JSON.stringify(peerConnection.localDescription), receiver: sender});

        } catch (error) {
            console.log('on description ', error);
        }
    }

    handleAnswer = async ({answer, sender}) => {
        try {
            console.log('received answer')
            const RTCDescription = new RTCSessionDescription(JSON.parse(answer));

            if (!this.peers[sender]) await this.establishConnection(sender);

            const peerConnection = this.peers[sender].pc;
            await peerConnection.setRemoteDescription(RTCDescription);

            this.localIceCandidates.forEach((candidate) => {
                socket.emit("candidate", {candidate: JSON.stringify(candidate), receiver: sender});
            });

            this.localIceCandidates = [];

        } catch (error) {
            console.log('on description ', error);
        }
    }

    handleCandidate = async ({candidate, sender}) => {
        try {
            if (this.peers[sender]) {
                const peerConnection = this.peers[sender].pc;
                await peerConnection.addIceCandidate(new RTCIceCandidate(JSON.parse(candidate)));
            }

        } catch (error) {
            console.log('on candidate ', error);
        }
    }

    handleDisconnection = (socketId) => {
        if (this.peers[socketId]) {
            delete this.peers[socketId];
        }
    }

    establishConnection(socketId) {
        try {
            this.peers[socketId] = new WebRTCConnection({
                rtcConfig: {
                    iceServers: this.iceServers,
                },
                remoteSocketId: socketId,
                outboundStream: this.outboundStream,
                inboundStream: this.inboundStream,
            });
            console.log(this.peers[socketId])

            return this.peers[socketId];
        } catch (error) {
            console.log('start: ', error);
        }
    }
}
