require("dotenv").config();
var sslRedirect = require("heroku-ssl-redirect");
var express = require("express");
var app = express();
var path = require('path');
var http = require("http").createServer(app);
var io = require("socket.io")(http);
var twillioAuthToken = process.env.LOCAL_AUTH_TOKEN;
var twillioAccountSID = process.env.LOCAL_TWILLIO_SID;
var twilio = require("twilio")(twillioAccountSID, twillioAuthToken);
const {generateRandomWord} = require("./server/roomNamesGenerator");

app.use(sslRedirect());
app.use(express.static(path.resolve("client")));
var iceServers;

twilio.tokens.create(function (err, response) {
    iceServers = JSON.stringify(response.iceServers);
});

app.post("/create", function (req, res) {
    const roomName = generateRandomWord();
    res.redirect(307, `/room/${roomName}`);
});

const users = {};
const rooms = {};

app.get("/", function(req, res) {
    res.sendFile(path.resolve("./client/index.html"));
})

app.post("/room/:roomName", function(req, res) {
    const roomName = req.params.roomName;
    if (!rooms[roomName]) {
        rooms[roomName] = {
            users: {},
        }
    }

    res.sendFile(path.resolve("./client/game.html"));
})

function getSocket(socketId) {
    return io.sockets.connected[socketId];
}

function sendUpdate(socketId, pkg) {
    if (pkg && getSocket(socketId)) {
        // pkg = new Buffer(JSON.stringify(pkg));
        // pkg = zlib.deflate(pkg, () => server.getSocket(socketId).emit('tick', pkg));
        getSocket(socketId).emit('tick', pkg)
    }
}

setInterval(() => {
    Array.from(Object.entries(rooms)).forEach(([roomName, room]) => {
        const updatePacket = {};
        Array.from(Object.values(room.users)).forEach(user => {
            if (user.dirty) {
                updatePacket[user.id] = user;
                user.dirty = false;
            }
        })

        if (Object.keys(updatePacket).length > 0) {
            io.to(roomName).emit('tick', updatePacket);
        }
    })
}, 50);

io.on("connection", function (socket) {

    socket.on("init", async function (roomName) {
        const response = await twilio.tokens.create();

        const user = {
            id: socket.id,
            location: {x: 0, y: 0, z: 0},
            rotation: {y: 0},
            room: roomName,
        };
        rooms[roomName].users[user.id] = user;
        users[user.id] = user;

        socket.join(roomName);

        // send new player to rest of current users
        socket.to(roomName).emit('users', {[user.id]: user});

        socket.emit("init", {
            users: rooms[roomName].users,
            iceServers: JSON.stringify(response.iceServers),
            socketId: socket.id,
        });
    });

    socket.on('move', ({location, rotation}) => {
        if (users[socket.id]) {
            const user = users[socket.id];
            user.dirty = true;
            if (location) user.location = location;
            if (rotation) user.rotation = rotation;
        }
    });

    socket.on("offer", function ({offer, receiver}) {
        io.to(receiver).emit('offer', {offer, sender: socket.id});
    });

    socket.on("answer", function ({answer, receiver}) {
        io.to(receiver).emit('answer', {answer, sender: socket.id});
    });

    socket.on("candidate", function ({candidate, receiver}) {
        io.to(receiver).emit('candidate', candidate);
    });

    // negotiation is needed and waiting for initiator to send offer
    socket.on("ready", function({receiver}) {
        io.to(receiver).emit("ready", {sender: socket.id})
    });

    socket.on('disconnect', () => {
        const user = users[socket.id];
        socket.to(user.room).emit('disconnection', socket.id);
        delete users[socket.id];
    });
});

// Listen for Heroku port, otherwise just use 3000
var port = process.env.PORT || 5000;
http.listen(port, function () {
    console.log("http://localhost:" + port);
});
