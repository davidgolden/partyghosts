import {socket} from "./socket";
import PlayerAudio from "./PlayerAudio";

export default class Player {
    constructor() {
        socket.on('init', this.handleInit);
        socket.emit('init');
    }

    handleInit = async data => {
        this.audioConnection = new PlayerAudio(data);
    }
}
