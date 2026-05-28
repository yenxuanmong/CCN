const prisma = require("../../config/db");
const { generateRoomCode } = require("../../utils/helpers");

async function createRoom(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { username: true, displayName: true },
  });

  const name = `Phòng của ${user?.displayName || user?.username || "Player"}`;

  // Tạo phòng + player trong transaction, retry nếu trùng code
  let room;
  let attempts = 0;
  while (!room && attempts < 5) {
    attempts++;
    try {
      room = await prisma.$transaction(async (tx) => {
        const r = await tx.room.create({
          data: { name, code: generateRoomCode(), hostId: userId },
        });
        await tx.player.create({
          data: { userId, roomId: r.id, color: "blue", isReady: true },
        });
        return r;
      });
    } catch (err) {
      // Nếu trùng code (Unique constraint) thì thử lại, lỗi khác thì ném ra ngay
      if (err.code !== "P2002" || attempts >= 5) throw err;
    }
  }

  return room;
}

async function getRooms() {
  const rooms = await prisma.room.findMany({
    where: { status: "WAITING" },
    include: {
      players: {
        include: {
          user: { select: { id: true, username: true, displayName: true, level: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return rooms.map((r) => ({ ...r, playerCount: r.players.length }));
}

async function getRoom(roomId) {
  return prisma.room.findUnique({
    where: { id: roomId },
    include: {
      players: {
        include: {
          user: { select: { id: true, username: true, displayName: true, level: true, avatar: true } },
        },
      },
    },
  });
}

module.exports = { createRoom, getRooms, getRoom };
