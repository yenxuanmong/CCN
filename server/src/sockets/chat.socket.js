const prisma = require("../config/db");

module.exports = (io, socket) => {
  // ── JOIN GLOBAL LOBBY ──────────────────────────────────────────
  socket.on("join_global", ({ userId }) => {
    socket.join("global");
    socket.data.userId = userId;
    // Mỗi user join room riêng theo userId để nhận notifications (friend request, v.v.)
    if (userId) socket.join(userId);
  });

  // ── JOIN PRIVATE ROOM (chat 1-1) ───────────────────────────────
  // Mỗi cặp user có 1 room riêng: "private_<id1>_<id2>" (id nhỏ trước)
  socket.on("join_private", ({ userId, friendId }) => {
    const roomKey = privateRoomKey(userId, friendId);
    socket.join(roomKey);
  });

  // ── SEND MESSAGE ───────────────────────────────────────────────
  // Payload: { userId, content, roomId?, toId? }
  // - roomId có giá trị  → chat trong phòng game
  // - toId có giá trị    → chat riêng tư
  // - cả hai null        → global chat
  socket.on("send_message", async ({ userId, roomId, toId, content }) => {
    if (!content || !content.trim()) return;

    try {
      const message = await prisma.message.create({
        data: {
          fromId:  userId,
          toId:    toId   || null,
          roomId:  roomId || null,
          content: content.trim(),
        },
        include: {
          from: { select: { id: true, username: true, displayName: true, avatar: true } },
        },
      });

      const payload = {
        id:          message.id,
        content:     message.content,
        userId:      message.fromId,
        username:    message.from?.username    || "Unknown",
        displayName: message.from?.displayName || message.from?.username || "Unknown",
        avatar:      message.from?.avatar      || null,
        roomId:      message.roomId,
        toId:        message.toId,
        createdAt:   message.createdAt,
      };

      if (toId) {
        // Private: gửi vào room riêng của 2 người
        const roomKey = privateRoomKey(userId, toId);
        io.to(roomKey).emit("receive_message", payload);
      } else if (roomId) {
        // Room chat
        io.to(roomId).emit("receive_message", payload);
      } else {
        // Global chat
        io.to("global").emit("receive_message", payload);
      }
    } catch (err) {
      console.error("send_message error:", err.message);
      socket.emit("error", { message: err.message });
    }
  });
};

// Tạo key phòng riêng tư nhất quán (id nhỏ hơn đứng trước)
function privateRoomKey(id1, id2) {
  return "private_" + [id1, id2].sort().join("_");
}
