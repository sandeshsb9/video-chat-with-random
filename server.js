const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public')); // Serve static files

let waitingUsers = {}; // Object to store users by interest
let onlineUserCount = 0;

io.on('connection', socket => {
  onlineUserCount++;
  io.emit('update-online-users', onlineUserCount);

  console.log(`User connected: ${socket.id}. Online users: ${onlineUserCount}`);

  socket.on('disconnect', () => {
    onlineUserCount--;
    io.emit('update-online-users', onlineUserCount);

    if (socket.partner) {
      socket.partner.partner = null;
      socket.partner.emit('disconnected');
    }

    // Remove the disconnected user from the waitingUsers list
    for (const interest in waitingUsers) {
      waitingUsers[interest] = waitingUsers[interest].filter(user => user !== socket);
    }
  });

  // Find user based on interest
  socket.on('find-user', (interest) => {
    if (waitingUsers[interest] && waitingUsers[interest].length > 0) {
      const partner = waitingUsers[interest].pop();
      partner.partner = socket;
      socket.partner = partner;

      partner.emit('message', 'You are now connected with a stranger.');
      socket.emit('message', 'You are now connected with a stranger.');
    } else {
      if (!waitingUsers[interest]) {
        waitingUsers[interest] = [];
      }
      waitingUsers[interest].push(socket);
    }
  });

  // Handle incoming messages
  socket.on('message', message => {
    if (socket.partner) {
      socket.partner.emit('message', message);
    }
  });

  // Connect to next stranger
  socket.on('next', () => {
    if (socket.partner) {
      socket.partner.partner = null;
      socket.partner.emit('disconnected');
    }
    socket.partner = null;
  });

  // Handle WebRTC signaling
  socket.on('offer', offer => {
    if (socket.partner) {
      socket.partner.emit('offer', offer);
    }
  });

  socket.on('answer', answer => {
    if (socket.partner) {
      socket.partner.emit('answer', answer);
    }
  });

  socket.on('ice-candidate', candidate => {
    if (socket.partner) {
      socket.partner.emit('ice-candidate', candidate);
    }
  });
});

server.listen(3000, () => {
  console.log('Listening on *:3000');
});
