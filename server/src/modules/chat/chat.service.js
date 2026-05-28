const prisma = require("../../config/db");

const MSG_INCLUDE = {
  from: { select: { id: true, username: true, displayName: true, avatar: true } },
};

async function getRoomMessages(roomId) {
  return prisma.message.findMany({
    where: { roomId },
    include: MSG_INCLUDE,
    orderBy: { createdAt: "asc" },
    take: 100,
  });
}

async function getGlobalMessages() {
  // Global chat: roomId = null, toId = null
  return prisma.message.findMany({
    where: { roomId: null, toId: null },
    include: MSG_INCLUDE,
    orderBy: { createdAt: "asc" },
    take: 50,
  });
}

async function getPrivateMessages(userId, friendId) {
  return prisma.message.findMany({
    where: {
      OR: [
        { fromId: userId, toId: friendId },
        { fromId: friendId, toId: userId },
      ],
    },
    include: MSG_INCLUDE,
    orderBy: { createdAt: "asc" },
    take: 100,
  });
}

module.exports = { getRoomMessages, getGlobalMessages, getPrivateMessages };
