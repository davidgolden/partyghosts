import Player from "./Player";
import {socket} from "./socket";
import PlayerAudio from "./PlayerAudio";
import {Vector3, Ray, Matrix, Space} from "@babylonjs/core";

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

        this.distanceToDestination = 0;
        this.normalizedDestinationVector = new Vector3.Zero();
        this.speed = new Vector3(0, 0, 0.08);
        this.nextspeed = new Vector3.Zero();

        this.scene.registerBeforeRender(() => {
            if (this.distVec > 0) {
                this.distVec -= 0.1;
                this.mesh.translate(this.normalizedDestinationVector, 0.1, Space.WORLD);
                this.dirty = true;
            }

            // Player speed
            this.speed = Vector3.Lerp(this.speed, this.nextspeed, 0.3);
            // Turn to direction

            this.mesh.moveWithCollisions(this.speed);

            // Casting a ray to get height
            let ray = new Ray(new Vector3(this.mesh.position.x, this.scene.ground.getBoundingInfo().boundingBox.maximumWorld.y + 1, this.mesh.position.z), new Vector3(0, -1, 0));
            const worldInverse = new Matrix();
            this.scene.ground.getWorldMatrix().invertToRef(worldInverse);
            ray = Ray.Transform(ray, worldInverse);
            const pickInfo = this.scene.ground.intersects(ray);
            if (pickInfo.hit) {
                this.mesh.position.y = pickInfo.pickedPoint.y + 1;
            }
        });

        this.scene.onPointerDown = (e, pickResult) => {
            if (e.button === 0) { //left
                if (pickResult.hit && pickResult.pickedMesh === this.scene.ground) {
                    let targetVec = pickResult.pickedPoint;
                    const initVec = this.mesh.position.clone();
                    this.distVec = Vector3.Distance(targetVec, initVec);
                    this.destination = targetVec.clone();
                    targetVec = targetVec.subtract(initVec);
                    this.normalizedDestinationVector = Vector3.Normalize(targetVec);
                    this.mesh.lookAt(this.destination);
                }
            }
        }
    }

    handleInit = async data => {
        this.audioConnection = new PlayerAudio(data);
    }
}
