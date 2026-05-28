const { Server } = require("socket.io");
const roomSocket = require("./room.socket");
const gameSocket = require("./game.socket");
const chatSocket = require("./chat.socket");
const matchmakingSocket = require("./matchmaking.socket");
const { setIO } = require("../services/socket.instance");
const prisma = require("../config/db");

function initSocket(server) {
  const io = new Server(server, {
    cors: {
      origin: ["http://localhost:5000", "http://127.0.0.1:5000", "https://ccn-frontend-production.up.railway.app", "*"],
      methods: ["GET", "POST"],
    },
  });

  setIO(io);

  io.on("connection", (socket) => {
    console.log("⚡ User connected:", socket.id);

    // Lưu userId vào socket.data khi client join global
    // Đồng thời hủy cleanup timer nếu đây là reconnect
    socket.on("join_global", ({ userId }) => {
      if (!userId) return;
      socket.data.userId = userId;

      // Tìm socket cũ của cùng user và hủy cleanup timer nếu có
      io.fetchSockets().then(sockets => {
        for (const s of sockets) {
          if (s.id !== socket.id && s.data.userId === userId && s.data.cleanupTimer) {
            clearTimeout(s.data.cleanupTimer);
            s.data.cleanupTimer = null;
            console.log(`[Reconnect] Hủy cleanup timer cho user ${userId}`);
          }
        }
      }).catch(() => {});
    });

    roomSocket(io, socket);
    gameSocket(io, socket);
    chatSocket(io, socket);
    matchmakingSocket(io, socket);

    // Khi socket disconnect đột ngột (tắt tab, mất mạng)
    // → dọn player khỏi tất cả phòng họ đang ở
    // Dùng timeout để tránh cleanup khi user chỉ đang navigate giữa các trang
    socket.on("disconnect", async () => {
      console.log("❌ User disconnected:", socket.id);
      const userId = socket.data.userId;
      if (!userId) return;

      // Chờ 8 giây — nếu user reconnect trong thời gian này thì hủy cleanup
      // (navigate giữa các trang thường reconnect trong < 3 giây)
      const cleanupTimer = setTimeout(async () => {
        // Kiểm tra xem user đã reconnect chưa (có socket khác với userId này không)
        const sockets = await io.fetchSockets();
        const alreadyReconnected = sockets.some(s => s.data.userId === userId);
        if (alreadyReconnected) {
          console.log(`[Disconnect] User ${userId} đã reconnect, bỏ qua cleanup`);
          return;
        }

        console.log(`[Disconnect] Cleanup player cho user ${userId}`);
        try {
          const players = await prisma.player.findMany({
            where: { userId, gameId: null },
            select: { roomId: true },
          });

          for (const p of players) {
            if (!p.roomId) continue;

            await prisma.player.deleteMany({ where: { userId, roomId: p.roomId } });

            const remaining = await prisma.player.count({ where: { roomId: p.roomId } });

            if (remaining === 0) {
              await prisma.room.deleteMany({ where: { id: p.roomId } });
              io.emit("room_deleted", { roomId: p.roomId });
            } else {
              io.to(p.roomId).emit("player_left", { userId });
              // Chuyển host nếu cần
              const room = await prisma.room.findUnique({ where: { id: p.roomId } });
              if (room?.hostId === userId) {
                const next = await prisma.player.findFirst({ where: { roomId: p.roomId } });
                if (next) {
                  await prisma.room.update({ where: { id: p.roomId }, data: { hostId: next.userId } });
                  io.to(p.roomId).emit("host_changed", { newHostId: next.userId });
                }
              }
            }
          }
        } catch (err) {
          console.error("disconnect cleanup error:", err.message);
        }
      }, 8000);

      // Lưu timer để có thể hủy nếu reconnect
      socket.data.cleanupTimer = cleanupTimer;
    });
  });

  return io;
}

module.exports = initSocket;
