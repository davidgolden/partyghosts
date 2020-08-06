import Player from "./Player";
import {socket} from "./socket";
import PlayerAudio from "./PlayerAudio";
import {Vector3} from "@babylonjs/core";

export default class Hero extends Player {
    constructor(config) {
        super(config);

        this.scene.camera.lockedTarget = this.mesh;

        setInterval(() => {
            if (this.dirty) {
                socket.emit('move', {
                    location: {
                        x: this.mesh.position.x,
                        y: this.mesh.position.y,
                        z: this.mesh.position.z,
                    },
                    rotation: {
                        y: this.mesh.rotation.y,
                    }
                });
                this.dirty = false;
            }
        }, 50);

        this.previousPosition = this.mesh.position.clone();
        this.scene.registerBeforeRender(() => {

            if (!this.previousPosition.equalsWithEpsilon(this.mesh.position, .5)) {
                this.dirty = true;
                this.previousPosition = this.mesh.position.clone();
            }
        })

        this.scene.onPointerDown = (e, pickResult) => {
            if (e.button === 0) { //left
                if (pickResult.hit && pickResult.pickedMesh === this.scene.ground) {
                    this.moveToDestination(pickResult.pickedPoint)
                }
            }
        }
    }

    handleInit = async data => {
        this.audioConnection = new PlayerAudio(data);
    }
}
