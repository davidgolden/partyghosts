import "core-js/stable";
import "regenerator-runtime/runtime";
import Player from "./Player";
import {
    Vector3,
    Engine,
} from "@babylonjs/core";
import Hero from "./Hero";
import {socket} from "./socket";
import WorldScene from "./WorldScene";
import PreviewScene from "./PreviewScene";

const roomName = window.location.href.match(/\/room\/(\w*)$/)[1];
const canvas = document.getElementById("renderCanvas");
const engine = new Engine(canvas, true);

const scene = new WorldScene(engine, canvas);

const users = {};

function addUser(user) {
    users[user.id] = new Player({scene, engine, playerObj: user});
}

let hero, initData, socketId;
socket.on('init', data => {
    initData = data;
    socketId = data.socketId;
    Array.from(Object.values(data.users)).forEach(node => {
        if (node.id !== socketId) {
            addUser(node);
        }
    })
});
socket.on('users', users => {
    Array.from(Object.values(users)).forEach(node => addUser(node));
});
socket.emit('init', roomName);

socket.on('tick', (updatePacket) => {
    Array.from(Object.values(updatePacket)).forEach(node => {
        if (hero && node.id !== hero.playerObj.id) {
            const player = users[node.id];
            if (node.location) player.moveToDestination(new Vector3(node.location.x, node.location.y, node.location.z));
            if (node.rotation) player.mesh.rotation.y = node.rotation.y;
        }
    })
});
socket.on('disconnection', id => {
    users[id].mesh.dispose(true, true);
    delete users[id];
});

// Register a render loop to repeatedly render the scene
engine.runRenderLoop(function () {
    scene.render();
});

// Watch for browser/canvas resize events
window.addEventListener("resize", function() {
    engine.resize();
});

function onHero(playerObj) {
    previewScene.dispose();
    previewEngine.dispose();
    document.getElementById('modal-background').style.display = 'none';

    hero = new Hero({
        scene,
        engine,
        playerObj,
    });
    hero.handleInit(initData);
}

const previewCanvas = document.getElementById('previewCanvas');
const previewEngine = new Engine(previewCanvas, true);
const previewScene = new PreviewScene(previewEngine, previewCanvas, onHero, roomName);

previewEngine.runRenderLoop(function() {
    previewScene.render();
});
