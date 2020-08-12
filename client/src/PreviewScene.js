import {
    ArcRotateCamera,
    Color3,
    DirectionalLight,
    MeshBuilder,
    Scene,
    ShadowGenerator,
    StandardMaterial,
    Vector3
} from "@babylonjs/core";
import {generateIndex} from "../../server/roomNamesGenerator";
import {socket} from "./socket";

const colors = [Color3.Blue(), Color3.Red(), Color3.Green()];

export default class PreviewScene extends Scene {
    constructor(engine, canvas, onHero, roomName) {
        super(engine);

        this.camera = new ArcRotateCamera("previewCamera", Math.PI / 3, Math.PI / 4, 4, new Vector3(0, 1, 0), this);
        this.camera.attachControl(canvas, true, true, 1);

        const light = new DirectionalLight("sun", new Vector3(-1, -2, -1), this);
        light.position = new Vector3(20, 40, 20);
        light.intensity = 1;
        light.diffuse = new Color3(1, 1, 1);

        this.shadowGenerator = new ShadowGenerator(200, light);
        this.shadowGenerator.useExponentialShadowMap = true;

        const preview = MeshBuilder.CreateSphere("preview", {diameter: 1}, this);
        preview.position.y = 1;

        const wrap = new StandardMaterial("wrap", this);
        let currentColorIndex = generateIndex(colors);
        wrap.diffuseColor = colors[currentColorIndex];
        preview.material = wrap;

        const nextColorButton = document.getElementById("nextColorButton");
        const prevColorButton = document.getElementById("prevColorButton");
        const nameInput = document.getElementById('name');
        const submitButton = document.getElementById('submit');

        nextColorButton.addEventListener('click', () => {
            if (currentColorIndex === colors.length - 1) {
                currentColorIndex = 0;
            } else {
                currentColorIndex++;
            }
            wrap.diffuseColor = colors[currentColorIndex];
        });

        prevColorButton.addEventListener("click", () => {
            if (currentColorIndex === 0) {
                currentColorIndex = colors.length - 1;
            } else {
                currentColorIndex--;
            }
            wrap.diffuseColor = colors[currentColorIndex];
        });

        submitButton.addEventListener('click', () => {
            if (nameInput.value.length === 0) {
                alert('You must enter a name1')
            } else {
                socket.emit('newplayer', {
                    name: nameInput.value,
                    color: colors[currentColorIndex],
                    roomName,
                }, onHero)
            }
        })
    }
}
