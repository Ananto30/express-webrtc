module.exports = function (io) {
    io.on('connection', function (socket) {

        var roomId = null;

        socket.on('join:room', function (data) {
            console.log(data);
            socket.join(data.room_id);
            roomId = data.room_id;
            io.in(data.room_id).clients((err, clients) => {
                console.log(clients);
                io.to(data.room_id).emit('room:members', clients);
            });
        });

        socket.on('room:event', function (data) {
            data.message.senderId = socket.id;
            io.to(data.room_id).emit('room:event', data.message);
        });

        socket.on('disconnect', function (data) {
            console.log("disconnected");
            io.in(roomId).clients((err, clients) => {
                console.log(clients);
                io.to(roomId).emit('room:members', clients);
            });
        });
    });
};

