const prisma = require("../config/db");
const { generateRoomCode } = require("../utils/helpers");

async function findMatch(userId) {
  // Find a waiting room that isn't full (< 4 players)
  const room = await prisma.room.findFirst({
    where: {
      status: "WAITING",
    },
    include: {
      players: true,
    },
    orderBy: { createdAt: "asc" },
  });

  if (room && room.players.length < room.maxPlayers) {
    return room;
  }

  // No suitable room — create one
  const newRoom = await prisma.room.create({
    data: {
      name:      "Quick Match",
      code:      generateRoomCode(),
      hostId:    userId,
      maxPlayers: 4,
    },
    include: { players: true },
  });

  return newRoom;
}

module.exports = { findMatch };
