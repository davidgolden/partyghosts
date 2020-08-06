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

app.use(sslRedirect());
app.use(express.static("client"));
var iceServers;

twilio.tokens.create(function (err, response) {
    iceServers = JSON.stringify(response.iceServers);
});

app.get("/", function (req, res) {
    res.sendFile(path.resolve("index.html"));
});

const nodes = {};

io.on("connection", function (socket) {

    socket.on("init", async function () {
        const response = await twilio.tokens.create();

        // add new player to memory
        nodes[socket.id] = {
            id: socket.id,
            location: {x: 0, y: 0, z: 0},
            rotation: {y: 0},
        };

        // send new player to rest of current players
        socket.broadcast.emit('players', {[socket.id]: nodes[socket.id]});

        socket.emit("init", {
            nodes,
            iceServers: JSON.stringify(response.iceServers),
            socketId: socket.id,
        });
    });

    socket.on('move', ({location, rotation}) => {
        if (nodes[socket.id]) {
            const player = nodes[socket.id];
            player.dirty = true;
            if (location) player.location = location;
            if (rotation) player.rotation = rotation;
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

    socket.on('present', function() {
        if (nodes[socket.id]) {
            for (let k in nodes) {
                if (nodes.hasOwnProperty(k)) {
                    nodes[k] = 'viewer';
                }
            }
            nodes[socket.id] = 'presenter';

            socket.emit('presenter', socket.id);
            socket.broadcast.emit('presenter', socket.id);
        }
    });

    socket.on('disconnect', () => {
        socket.broadcast.emit('disconnection', socket.id);
        delete nodes[socket.id];
    });
});

// Listen for Heroku port, otherwise just use 3000
var port = process.env.PORT || 5000;
http.listen(port, function () {
    console.log("http://localhost:" + port);
});
