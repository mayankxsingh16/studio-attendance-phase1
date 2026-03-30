require("dotenv").config();
const http = require("http");
const app = require("./src/app");
const connectDB = require("./src/config/db");
const ensureDefaultAdmin = require("./src/utils/ensureDefaultAdmin");
const { initSocket } = require("./src/config/socket");
const { setupSocketHandlers } = require("./src/sockets/attendanceSocket");

const PORT = process.env.PORT || 10000;

async function start() {
  await connectDB();
  await ensureDefaultAdmin();
  const server = http.createServer(app);
  const io = initSocket(server);
  setupSocketHandlers(io);

  
  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

start().catch((error) => {
  console.error("Server start failed:", error);
  process.exit(1);
});
