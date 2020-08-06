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

const canvas = document.getElementById("renderCanvas");
const engine = new Engine(canvas, true);

const scene = new WorldScene(engine, canvas);

const players = {};

function addPlayer(player) {
    players[player.id] = new Player({scene, engine, playerObj: player});
}

socket.on('init', data => {
    Array.from(Object.values(data.nodes)).forEach(node => {
        if (node.id === data.socketId) {
            const hero = new Hero({
                scene,
                engine,
                playerObj: node,
            });
            hero.handleInit(data);
        } else {
            addPlayer(node);
        }
    })
});
socket.on('players', players => {
    Array.from(Object.values(players)).forEach(node => addPlayer(node));
});
socket.emit('init');

socket.on('move', ({location, rotation, id}) => {
    if (players[id]) {
        if (location) players[id].mesh.position = new Vector3(location.x, location.y, location.z);
        if (rotation) players[id].mesh.rotation.y = rotation.y;
    }
});
socket.on('disconnect', id => {
    players[id].mesh.dispose(true, true);
    delete players[id];
});

// Register a render loop to repeatedly render the scene
engine.runRenderLoop(function () {
    scene.render();
});
