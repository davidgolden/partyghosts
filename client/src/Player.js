import {
    MeshBuilder,
    Vector3,
    PhysicsImpostor,
    Space,
    Ray,
    Matrix,
    StandardMaterial,
    Color3,
    DynamicTexture,
    Quaternion,
    Mesh
} from "@babylonjs/core";

export default class Player {
    constructor({scene, engine, playerObj}) {
        this.scene = scene;
        this.engine = engine;
        this.playerObj = playerObj;

        console.log(playerObj);
        this.mesh = MeshBuilder.CreateSphere(playerObj.id, {
            diameter: 1,
        }, this.scene);

        this.wrapper = new StandardMaterial(`wrapper-${this.playerObj.id}`, scene);
        this.wrapper.diffuseColor = new Color3(playerObj.color.r, playerObj.color.g, playerObj.color.b);
        this.mesh.material = this.wrapper;

        this.mesh.checkCollisions = true;
        this.mesh.applyGravity = true;
        this.mesh.physicsImpostor = new PhysicsImpostor(this.mesh, PhysicsImpostor.SphereImpostor, { mass: 1, friction: 1, restitution: 0 }, this.scene);
        this.mesh.reIntegrateRotationIntoRotationQuaternion = true; // absolutely necessary to make sure rotation works
        this.mesh.position = new Vector3(this.playerObj.location.x, .5, this.playerObj.location.z);
        this.mesh.rotation.y = this.playerObj.rotation.y;

        this.scene.shadowGenerator.addShadowCaster(this.mesh);

        this.distanceToDestination = 0;
        this.normalizedDestinationVector = new Vector3.Zero();
        this.speed = new Vector3(0, 0, 0.08);
        this.nextspeed = new Vector3.Zero();

        const writingPlane = MeshBuilder.CreatePlane("writingPlane", {width: 2, height: .5}, this.scene);
        const dynamicTexture = new DynamicTexture("dynamicTexture", {width:512, height:256}, this.scene, true);
        const mat = new StandardMaterial("mat", this.scene);
        writingPlane.position = new Vector3(0, 1, 0);
        writingPlane.parent = this.mesh;
        dynamicTexture.drawText(this.playerObj.name, null, null, "120px Arial", "#e5ef1c", "transparent", true);
        mat.diffuseTexture = dynamicTexture;
        mat.diffuseTexture.hasAlpha = true;
        writingPlane.material = mat;

        writingPlane.billboardMode = Mesh.BILLBOARDMODE_Y;

        this.mesh.registerAfterRender(mesh => {
            const q = Quaternion.RotationYawPitchRoll(mesh.rotation.y, mesh.rotation.x, mesh.rotation.z);
            mesh.rotationQuaternion.x = q.x;
            mesh.rotationQuaternion.z = q.z;
        });

        this.scene.registerBeforeRender(() => {
            // this is necessary to prevent jitter
            if (this.mesh.physicsImpostor) this.mesh.physicsImpostor.setLinearVelocity(new Vector3(0, 0, 0));

            if (this.distVec > 0) {
                this.distVec -= 0.1;
                this.mesh.translate(this.normalizedDestinationVector, 0.1, Space.WORLD);
                this.mesh.rot
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
    }

    moveToDestination = targetVec => {
        const initVec = this.mesh.position.clone();
        this.distVec = Vector3.Distance(targetVec, initVec);
        this.destination = targetVec.clone();
        targetVec = targetVec.subtract(initVec);
        this.normalizedDestinationVector = Vector3.Normalize(targetVec);
        this.mesh.lookAt(this.destination);
    }
}
