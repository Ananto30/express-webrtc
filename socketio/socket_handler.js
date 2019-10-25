module.exports = function (io) {
    io.on('connection', function (socket) {

        socket.on('join:room', function (data) {
            console.log(data);
            socket.join(data.room_id);
            members = io.sockets.adapter.rooms[data.room_id].sockets;
            io.in(data.room_id).clients((err, clients) => {
                console.log(clients);
                io.to(data.room_id).emit('room:members', clients);
            });
        });

        socket.on('room:event', function (data) {
            data.message.senderId = socket.id;
            io.to(data.room_id).emit('room:event', data.message);
        });


    });
};

