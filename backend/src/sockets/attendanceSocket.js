const { getIO } = require("../config/socket");
const { verifyToken } = require("../utils/jwt");

function emitAttendanceEvent(payload) {
  try {
    getIO().to("admin-room").emit("new_checkin", payload);
  } catch (_error) {
    // Ignore socket issues in local development
  }
}

function setupSocketHandlers(io) {
  io.on("connection", (socket) => {
    socket.on("join-admin", ({ token }) => {
      try {
        const user = verifyToken(token);
        if (user.role === "admin") {
          socket.join("admin-room");
          socket.emit("joined", { message: "Listening for live attendance updates." });
        }
      } catch (_error) {
        socket.emit("error", { message: "Unauthorized socket connection." });
      }
    });
  });
}

module.exports = {
  emitAttendanceEvent,
  setupSocketHandlers
};
