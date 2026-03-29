const { Server } = require("socket.io");

let io = null;

function initSocket(httpServer) {
  if (io) {
    return io;
  }

  io = new Server(httpServer, {
    cors: {
      origin: [
        process.env.FRONTEND_URL,
        "http://localhost:5173",
        "http://127.0.0.1:5173"
      ].filter(Boolean),
      methods: ["GET", "POST"]
    }
  });

  return io;
}

function getIO() {
  if (!io) {
    throw new Error("Socket.io not initialized.");
  }

  return io;
}

module.exports = {
  initSocket,
  getIO
};
