import {
    AmmoJSPlugin,
    ArcRotateCamera, ArcRotateCameraInputsManager, ArcRotateCameraPointersInput, Color3, HemisphericLight,
    MeshBuilder,
    PhysicsImpostor,
    Scene,
    StandardMaterial,
    Texture,
    Vector3
} from "@babylonjs/core";

export default class WorldScene extends Scene {
    constructor(engine, canvas) {
        super(engine);

        const gravityVector = new Vector3(0,-9.81, 0);
        const PhysicsPlugin = new AmmoJSPlugin();
        this.enablePhysics(gravityVector, PhysicsPlugin);
        this.gravity = gravityVector;

        const groundMaterial = new StandardMaterial("groundMaterial", this);
        groundMaterial.diffuseTexture = new Texture("./assets/grass.jpg", this);

        this.ground = MeshBuilder.CreateGround("ground", {height: 200, width: 200}, this);
        this.ground.position.y = 0;
        this.ground.physicsImpostor = new PhysicsImpostor(this.ground, PhysicsImpostor.PlaneImpostor, {mass: 0, friction: 2}, this);
        this.ground.material = groundMaterial;

        this.camera = new ArcRotateCamera("camera", Math.PI / 3, Math.PI / 4, 4, new Vector3(0, 1, 0), this);
        this.camera.lowerRadiusLimit = 10;
        this.camera.upperRadiusLimit = 100;
        this.camera.upperBetaLimit = Math.PI / 2 - 0.1;
        this.camera.inputs.attached.pointers.buttons = [1, 2];

        // This attaches the camera to the canvas
        this.camera.attachControl(canvas, true, true, 1);

        const light = new HemisphericLight("sun", new Vector3(0, 10, 0), this);
        light.diffuse = new Color3(1, 1, 1);
    }
}
