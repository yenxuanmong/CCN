const http = require("http");
const cors = require("cors");

const initSocket = require("./sockets");
const logger = require("./utils/logger");
const express = require("express");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const app = express();

// MIDDLEWARE
//////////////////////////////////////////////////
app.use(
  cors({
    origin: ["http://localhost:5000", "http://127.0.0.1:5000", "https://ccn-fe-production.up.railway.app"],
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

app.use(express.json());

const server = http.createServer(app);
const authRoute = require("./modules/auth/auth.route");
const userRoute = require("./modules/user/user.route");
const roomRoute = require("./modules/room/room.route");
const gameRoute = require("./modules/game/game.route");
const chatRoute = require("./modules/chat/chat.route");
const friendRoute = require("./modules/friend/friend.route");

app.use("/api/auth", authRoute);
app.use("/api/user", userRoute);
app.use("/api/room", roomRoute);
app.use("/api/game", gameRoute);
app.use("/api/chat", chatRoute);
app.use("/api/friend", friendRoute);

//////////////////////////////////////////////////
// ROUTE TEST
//////////////////////////////////////////////////

app.get("/", (req, res) => {
  res.send("🚀 Ludo Master Elite Backend Running");
});

app.get("/test-db", async (req, res) => {
  try {
    const users = await prisma.user.findMany();

    res.json({
      success: true,
      count: users.length,
      data: users,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

//////////////////////////////////////////////////
// SOCKET
//////////////////////////////////////////////////

const io = initSocket(server);

//////////////////////////////////////////////////
// START SERVER
//////////////////////////////////////////////////

const { PORT } = require("./config/env");

server.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});
module.exports = app;
