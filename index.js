const express = require("express");
const http = require("http");
const app = express();
const server = http.createServer(app);
const socket = require("socket.io");

const port = process.env.PORT || 8000;
const io = socket(server);

let rooms = [];

app.use(express.static("public"));

io.on("connection", (socket) => {
    console.log("New connection: " + socket.id);
    socket.emit("own-id", socket.id);
    socket.on("presentation", (clientInfo) => {
        var client = {
            username: clientInfo.username,
            id: clientInfo.id,
        };

        socket.join(clientInfo.room);
        //If the room exists, append to the room
        var room = rooms.find((room) => room.id === clientInfo.room);
        if (room) {
            room.clients.push(client);
        } else {
            //else, create and add the room
            room = {
                id: clientInfo.room,
                clients: [client],
            };
            rooms.push(room);
        }
        io.to(clientInfo.room).emit("userlist-update", room.clients);

        console.log("Current rooms: ", rooms);
    });

    socket.on("send-msg", (msg) => {
        console.log(`Message sent: ${msg.body} to room: ${msg.roomId}`);
        io.to(msg.roomId).emit("msg", msg);
    });

    socket.on("isTyping", (roomId) => {
        console.log(`${socket.id} is Typing in room: ${roomId}`);
        socket.to(roomId).broadcast.emit("isTyping", socket.id);
    });

    socket.on("clientStoppedTyping", (roomId) => {
        console.log(`${socket.id} stopped Typing in room ${roomId}`);
        socket.to(roomId).broadcast.emit("stoppedTyping", socket.id);
    });

    socket.on("disconnecting", (reason) => {
        console.log(
            `DISCONNECT - Disconnecting user ${socket.id} from all rooms`
        );
        for (roomId of Object.values(socket.rooms)) {
            if (roomId) {
                var room = rooms.find((room) => room.id === roomId);
                if (room) {
                    room.clients = room.clients.filter(
                        (user) => user.id !== socket.id
                    );
                    io.to(roomId).emit("userlist-update", room.clients);
                }
            }
        }
    });

    socket.on("leave", (roomId) => {
        console.log(`LEAVE - user ${socket.id} leaving room: ${roomId}`);
        socket.leave(roomId);
        //update room clients list
        let room = rooms.find((room) => room.id === roomId);
        room.clients = room.clients.filter((user) => user.id !== socket.id);
        //push the changes to the room
        io.to(roomId).emit("userlist-update", room.clients);
    });
});

server.listen(port, () => console.log(`Server is running on port ${port}`));
