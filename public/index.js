const connections = [];
let peers = {};
let inboundStream = new MediaStream(), outboundStream = new MediaStream();
let iceServers, localIceCandidates = [];
let localSocketId = null;
let role = "viewer";
let presenterID = null;
let connected = false;
let localAudioSender = null;

const presentButton = document.getElementById('present');

const socket = io();

// get all the initial data about the current room and local client's role
socket.on('init', async data => {
    localSocketId = data.socketId;
    iceServers = JSON.parse(data.iceServers);

    // once we have iceServers, we can establish a new connection
    for (let k in data.nodes) {
        if (data.nodes.hasOwnProperty(k) && k !== localSocketId) {
            addConnection(k);
            const connection = await establishConnection(k);

            // when a new connection is established, the local client becomes the initiator for every current peer
            connection.localClientIsInitiator = true;
        }
    }

    socket.on('offer', handleOffer);
    socket.on('answer', handleAnswer);
    socket.on('newconnection', handleNewConnection);
    socket.on('disconnection', handleDisconnection);
    socket.on('candidate', handleCandidate);
    socket.on('ready', handleReadyForOffer);

    outboundStream = await navigator.mediaDevices.getUserMedia({audio: true, video: false});

    for (let k in peers) {
        if (peers.hasOwnProperty(k)) {
            peers[k].setConnectedClientIsPresenter();
            peers[k].setTracks();
        }
    }

    resetAudioElement(inboundStream);

    presentButton.addEventListener('click', () => {
        socket.emit('present');
    });
});
socket.emit('init');

async function handleReadyForOffer({sender}) {
    if (!peers[sender]) await establishConnection(sender);

    peers[sender].createOffer();
}

function resetAudioElement(stream) {
    let localAudio = document.getElementById('audio');
    const container = document.getElementById('container');

    if (localAudio) {
        container.removeChild(localAudio);
    }

    localAudio = document.createElement('audio');
    localAudio.setAttribute('id', 'audio');
    localAudio.setAttribute('playsinline', '');
    localAudio.setAttribute('autoplay', '');
    localAudio.setAttribute('style', "height:50%;margin: 0 auto;display:block;");
    localAudio.srcObject = stream;

    container.appendChild(localAudio);
}

function addConnection(connectionId) {
    connections.push(connectionId);

    const container = document.getElementById('connections');
    container.innerHTML = "";
    connections.forEach(connection => {
        const item = document.createElement('li');
        item.innerHTML = connection;
        container.appendChild(item);
    })
}

function removeConnection(connectionId) {
    const index = connections.findIndex(c => c === connectionId);
    if (index > -1) {
        connections.splice(index, 1);
    }
}

async function handleOffer({offer, sender}) {
    try {
        console.log('received offer');
        const RTCDescription = new RTCSessionDescription(JSON.parse(offer));

        if (!peers[sender]) await establishConnection(sender);

        const peerConnection = peers[sender].pc;

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

async function handleAnswer({answer, sender}) {
    try {
        console.log('received answer')
        const RTCDescription = new RTCSessionDescription(JSON.parse(answer));

        if (!peers[sender]) await establishConnection(sender);

        const peerConnection = peers[sender].pc;
        await peerConnection.setRemoteDescription(RTCDescription);

        localIceCandidates.forEach((candidate) => {
            socket.emit("candidate", {candidate: JSON.stringify(candidate), receiver: sender});
        });

        localIceCandidates = [];

    } catch (error) {
        console.log('on description ', error);
    }
}

async function handleCandidate({candidate, sender}) {
    try {
        if (peers[sender]) {
            const peerConnection = peers[sender].pc;
            await peerConnection.addIceCandidate(new RTCIceCandidate(JSON.parse(candidate)));
        }

    } catch (error) {
        console.log('on candidate ', error);
    }
}

async function handleNewConnection(socketId) {
    addConnection(socketId);
}

async function handleDisconnection(socketId) {
    if (peers[socketId]) {
        peers[socketId].destroy();
    }
}

class Connection {
    constructor(configuration, remoteSocketId) {
        this.pc = new RTCPeerConnection(configuration);
        this.remoteSocketId = remoteSocketId;
        this.localClientIsInitiator = false;

        this.pc.onicecandidate = event => {
            if (event.candidate != null) {
                if (connected) {
                    socket.emit('candidate', {candidate: event.candidate, receiver: JSON.stringify(event.candidate)})
                } else {
                    localIceCandidates.push(event.candidate);
                }
            }
        };

        this.pc.ontrack = event => {
            console.log('ontrack');
            inboundStream.addTrack(event.track);
            resetAudioElement(inboundStream);
        };

        this.pc.onaddstream = event => {
            console.log('onaddstream');
        }

        this.pc.oniceconnectionstatechange = event => {
            console.log('state change: ', this.pc.iceConnectionState);
            if (this.pc.iceConnectionState === 'failed') {
                // location.reload();
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
                this.setTracks(true);
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
    }

    setConnectedClientIsPresenter() {
        this.connectedClientIsPresenter = presenterID === this.remoteSocketId;
    }

    setTracks(renegotiating = false) {
        console.log(renegotiating);
        if (renegotiating && localAudioSender) {
            this.pc.removeTrack(localAudioSender);
        } else if (!renegotiating) {
            // if setting up new connection and local client is viewer, just need to add audio tracks
            outboundStream.getAudioTracks().forEach(track => {
                this.pc.addTrack(track);
            });
        }
    }

    async createOffer() {
        const offer = await this.pc.createOffer({
            offerToReceiveAudio: true,
        });
        await this.pc.setLocalDescription(offer);
        console.log('sending offer ', this.pc.localDescription);
        socket.emit('offer', {offer: JSON.stringify(this.pc.localDescription), receiver: this.remoteSocketId});
    }

    destroy() {
        delete peers[this.remoteSocketId];
        removeConnection(this.remoteSocketId);
    }
}

async function establishConnection(socketId) {
    try {
        peers[socketId] = new Connection({
            iceServers,
        }, socketId);

        return peers[socketId];
    } catch (error) {
        console.log('start: ', error);
    }
}
