const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*", // อนุญาตให้ทุกเว็บเชื่อมต่อได้ (รวมถึง GitHub Pages ของคุณ)
        methods: ["GET", "POST"]
    }
});

// หน่วยความจำจำลองสำหรับเก็บข้อมูลแต่ละห้อง
const rooms = {};

io.on('connection', (socket) => {
    console.log('ผู้เล่นเชื่อมต่อ:', socket.id);

    // สร้างห้องใหม่
    socket.on('create_room', (data, callback) => {
        const roomCode = Math.floor(1000 + Math.random() * 9000).toString();
        socket.join(roomCode);
        rooms[roomCode] = data.initialState;
        callback({ success: true, roomCode: roomCode });
    });

    // เข้าร่วมห้อง
    socket.on('join_room', (data, callback) => {
        const { roomCode, playerState } = data;
        if (rooms[roomCode]) {
            socket.join(roomCode);

            // อัปเดตรายชื่อผู้เล่นในห้อง
            let state = rooms[roomCode];
            let myPlayerId = state.playerCount;
            playerState.id = myPlayerId;
            state.players[myPlayerId] = playerState;
            state.playerCount++;

            // ส่งข้อมูลให้ทุกคนในห้องทราบ
            io.to(roomCode).emit('state_updated', state);
            callback({ success: true, state: state, myPlayerId: myPlayerId });
        } else {
            callback({ success: false, message: "ไม่พบรหัสห้องนี้" });
        }
    });

    // รับข้อมูลการอัปเดตกระดาน แล้วกระจายให้เพื่อนในห้อง
    socket.on('update_state', (data) => {
        const { roomCode, newState } = data;
        rooms[roomCode] = newState;
        socket.to(roomCode).emit('state_updated', newState); // ส่งให้เพื่อน
    });

    socket.on('disconnect', () => {
        console.log('ผู้เล่นออกจากการเชื่อมต่อ:', socket.id);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});