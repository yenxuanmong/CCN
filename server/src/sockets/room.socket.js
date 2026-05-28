const prisma = require("../config/db");
const { isBotUserId, removeBotsFromRoom } = require("../services/bot.service");

module.exports = (io, socket) => {

  socket.on("join_room", async ({ roomId, userId }) => {
    try {
      // ── 1. Rời phòng cũ TRƯỚC (khác phòng đang join) ────────────
      const oldPlayers = await prisma.player.findMany({
        where: { userId, gameId: null, roomId: { not: roomId } },
        select: { roomId: true },
      });
      for (const op of oldPlayers) {
        if (!op.roomId) continue;
        await prisma.player.deleteMany({ where: { userId, roomId: op.roomId } });
        socket.leave(op.roomId);
        const remaining = await prisma.player.count({ where: { roomId: op.roomId } });
        if (remaining === 0) {
          await prisma.room.deleteMany({ where: { id: op.roomId } });
          io.emit("room_deleted", { roomId: op.roomId });
        } else {
          io.to(op.roomId).emit("player_left", { userId });
          const oldRoom = await prisma.room.findUnique({ where: { id: op.roomId } });
          if (oldRoom?.hostId === userId) {
            const next = await prisma.player.findFirst({ where: { roomId: op.roomId } });
            if (next) {
              await prisma.room.update({ where: { id: op.roomId }, data: { hostId: next.userId } });
              io.to(op.roomId).emit("host_changed", { newHostId: next.userId });
            }
          }
        }
      }

      // ── 2. Kiểm tra phòng đang join còn tồn tại không ───────────
      const room = await prisma.room.findUnique({
        where: { id: roomId },
        select: { id: true, hostId: true },
      });
      if (!room) {
        socket.emit("room_not_found", { roomId });
        return;
      }

      // ── 3. Nếu có người thật join, xóa bớt 1 bot (nếu có) ──────
      // Đảm bảo tổng số không vượt quá 4
      const currentCount = await prisma.player.count({ where: { roomId } });
      if (currentCount >= 4) {
        // Xóa 1 bot để nhường chỗ cho người thật
        const botPlayer = await prisma.player.findFirst({
          where: { roomId },
          include: { user: { select: { username: true } } },
        });
        const botToRemove = await prisma.player.findFirst({
          where: { roomId },
          include: { user: { select: { id: true, username: true } } },
        }).then(async () => {
          // Tìm player có user.username bắt đầu bằng "bot_"
          const allInRoom = await prisma.player.findMany({
            where: { roomId },
            include: { user: { select: { id: true, username: true } } },
          });
          return allInRoom.find((p) => p.user?.username?.startsWith("bot_"));
        });

        if (botToRemove) {
          await prisma.player.delete({ where: { id: botToRemove.id } });
          io.to(roomId).emit("bot_removed", { botUserId: botToRemove.userId });
        }
      }

      // ── 4. Join socket room ──────────────────────────────────────
      socket.join(roomId);

      // ── 5. Upsert player record ──────────────────────────────────
      let player = await prisma.player.findFirst({
        where: { userId, roomId },
        include: { user: { select: { username: true, displayName: true, level: true } } },
      });
      if (!player) {
        const colors = ["blue", "red", "green", "yellow"];
        const usedColors = await prisma.player
          .findMany({ where: { roomId }, select: { color: true } })
          .then((ps) => ps.map((p) => p.color));
        const availColor = colors.find((c) => !usedColors.includes(c)) || colors[0];
        const isHost = room.hostId === userId;
        player = await prisma.player.create({
          data: { userId, roomId, color: availColor, isReady: isHost },
          include: { user: { select: { username: true, displayName: true, level: true } } },
        });
      }

      const isHost     = room.hostId === userId;
      const playerName = player.user?.displayName || player.user?.username || "Player";

      // ── 6. Gửi cho socket này ────────────────────────────────────
      socket.emit("player_assigned", { playerId: player.id, color: player.color, isHost, isReady: player.isReady });

      // ── 7. Broadcast cho cả phòng ────────────────────────────────
      io.to(roomId).emit("player_joined", {
        userId,
        playerId: player.id,
        username: playerName,
        level:    player.user?.level || 1,
        color:    player.color,
        isHost,
        isReady:  player.isReady,
      });

    } catch (err) {
      console.error("join_room error:", err.message);
      socket.emit("error", { message: err.message });
    }
  });

  // ─────────────────────────────────────────────────────────────────
  // Thêm bot vào phòng (chỉ host mới được gọi)
  socket.on("add_bot", async ({ roomId, userId }) => {
    try {
      const room = await prisma.room.findUnique({ where: { id: roomId } });
      if (!room || room.hostId !== userId) return;

      const count = await prisma.player.count({ where: { roomId } });
      if (count >= 4) {
        socket.emit("error", { message: "Phòng đã đủ 4 người!" });
        return;
      }

      const colors = ["blue", "red", "green", "yellow"];
      const usedColors = await prisma.player
        .findMany({ where: { roomId }, select: { color: true } })
        .then((ps) => ps.map((p) => p.color));
      const availColor = colors.find((c) => !usedColors.includes(c)) || colors[count % 4];

      const botNames = ["Bot Alpha", "Bot Beta", "Bot Gamma", "Bot Delta"];
      const existingBots = await prisma.player.count({
        where: { roomId, userId: { startsWith: "BOT_" } },
      });
      const botName = botNames[existingBots] || "Bot " + (existingBots + 1);
      // botUserId dùng username làm key duy nhất để upsert User
      const botUsername = "bot_" + roomId.slice(0, 8) + "_" + existingBots;

      // Upsert User record cho bot (FK bắt buộc)
      const botUser = await prisma.user.upsert({
        where:  { username: botUsername },
        update: {},
        create: {
          username:    botUsername,
          displayName: botName,
          password:    "BOT_NO_LOGIN",
          level:       1,
        },
      });

      // Tạo Player record
      const existing = await prisma.player.findFirst({ where: { userId: botUser.id, roomId } });
      if (!existing) {
        await prisma.player.create({
          data: { userId: botUser.id, roomId, color: availColor, isReady: true },
        });
      }

      io.to(roomId).emit("player_joined", {
        userId:   botUser.id,
        playerId: botUser.id,
        username: botName,
        level:    1,
        color:    availColor,
        isHost:   false,
        isReady:  true,
        isBot:    true,
      });
    } catch (err) {
      console.error("add_bot error:", err.message);
      socket.emit("error", { message: err.message });
    }
  });

  // ─────────────────────────────────────────────────────────────────
  // Xóa bot khỏi phòng (chỉ host mới được gọi)
  socket.on("remove_bot", async ({ roomId, userId, botUserId }) => {
    try {
      const room = await prisma.room.findUnique({ where: { id: roomId } });
      if (!room || room.hostId !== userId) return;

      // Kiểm tra botUserId thực sự là bot (username bắt đầu bằng "bot_")
      const botUser = await prisma.user.findUnique({
        where: { id: botUserId },
        select: { username: true },
      });
      if (!botUser || !botUser.username.startsWith("bot_")) return;

      await prisma.player.deleteMany({ where: { userId: botUserId, roomId } });
      io.to(roomId).emit("player_left", { userId: botUserId, isBot: true });
    } catch (err) {
      console.error("remove_bot error:", err.message);
    }
  });

  // ─────────────────────────────────────────────────────────────────
  socket.on("toggle_ready", async ({ roomId, userId }) => {
    try {
      const player = await prisma.player.findFirst({ where: { userId, roomId } });
      if (!player) return;

      const updated = await prisma.player.update({
        where: { id: player.id },
        data:  { isReady: !player.isReady },
      });

      // Broadcast trạng thái mới cho tất cả người trong phòng
      io.to(roomId).emit("ready_changed", {
        userId,
        isReady: updated.isReady,
      });
    } catch (err) {
      console.error("toggle_ready error:", err.message);
    }
  });

  // ─────────────────────────────────────────────────────────────────
  socket.on("leave_room", async ({ roomId, userId }) => {
    try {
      socket.leave(roomId);
      await prisma.player.deleteMany({ where: { userId, roomId } });

      const remaining = await prisma.player.count({ where: { roomId } });
      if (remaining === 0) {
        await prisma.room.deleteMany({ where: { id: roomId } });
        io.emit("room_deleted", { roomId });
      } else {
        io.to(roomId).emit("player_left", { userId });
        const room = await prisma.room.findUnique({ where: { id: roomId } });
        if (room?.hostId === userId) {
          const next = await prisma.player.findFirst({ where: { roomId } });
          if (next) {
            await prisma.room.update({ where: { id: roomId }, data: { hostId: next.userId } });
            io.to(roomId).emit("host_changed", { newHostId: next.userId });
          }
        }
      }
    } catch (err) {
      console.error("leave_room error:", err.message);
    }
  });

  // ─────────────────────────────────────────────────────────────────
  socket.on("room_invite", async ({ fromUserId, toUserId, roomId }) => {
    try {
      const [from, room] = await Promise.all([
        prisma.user.findUnique({ where: { id: fromUserId }, select: { username: true, displayName: true } }),
        prisma.room.findUnique({ where: { id: roomId }, select: { id: true, name: true, code: true } }),
      ]);
      if (!from || !room) return;
      io.to(toUserId).emit("room_invite", {
        fromUserId,
        fromName: from.displayName || from.username || "Ai đó",
        roomId: room.id,
        roomName: room.name,
        roomCode: room.code,
      });
    } catch (err) {
      console.error("room_invite error:", err.message);
    }
  });
};
