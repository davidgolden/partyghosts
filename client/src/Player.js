import {socket} from "./socket";
import PlayerAudio from "./PlayerAudio";
import {MeshBuilder, Vector3, PhysicsImpostor} from "@babylonjs/core";

export default class Player {
    constructor({scene, engine, playerObj}) {
        this.scene = scene;
        this.engine = engine;
        this.playerObj = playerObj;

        this.mesh = MeshBuilder.CreateSphere(playerObj.id, {
            diameter: 1,
        });

        this.mesh.checkCollisions = true;
        this.mesh.applyGravity = true;
        this.mesh.physicsImpostor = new PhysicsImpostor(this.mesh, PhysicsImpostor.BoxImpostor, { mass: 1, friction: 100 }, this.scene);
        this.mesh.reIntegrateRotationIntoRotationQuaternion = true; // absolutely necessary to make sure rotation works
        this.mesh.position = new Vector3(this.playerObj.location.x, 0, this.playerObj.location.z);
        this.mesh.rotation.y = this.playerObj.rotation.y;
    }
}
