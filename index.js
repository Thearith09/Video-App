const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const router = require('./routes/route');
const path = require('path');
let activeSockets = [];

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, './public')));


io.on('connection', (socket) => {
    console.log('A user connected!');
    const existingSocket = activeSockets.find((existingSocket) => existingSocket === socket.id);

    if (!existingSocket) {
        activeSockets.push(socket.id);
        console.log(socket.id);
        console.log(activeSockets);
        console.log(activeSockets.length);

        socket.emit('update-user-list', {
            users: activeSockets.filter((existingSocket) => existingSocket !== socket.id)
        });

        socket.broadcast.emit('update-user-list', {
            users: [socket.id]
        });
    }

    socket.on("call-user", (data) => {
        socket.to(data.to).emit("call-made", {
            offer: data.offer,
            socket: socket.id
        });
    });

    socket.on("make-answer", (data) => {
        socket.to(data.to).emit("answer-made", {
            socket: socket.id,
            answer: data.answer
        });
    });

    socket.on("reject-call", (data) => {
        socket.to(data.from).emit("call-rejected", {
            socket: socket.id
        });
    });

    socket.on('disconnect', () => {
        activeSockets = activeSockets.filter((existingSocket) => existingSocket !== socket.id);

        socket.broadcast.emit('remove-user', {
            socketId: socket.id
        });
    });

});


const port = process.env.PORT || 3000;
http.listen(port, () => console.log(`Server is running on port: ${port}.`));