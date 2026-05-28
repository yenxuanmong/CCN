const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const bcrypt = require("bcrypt");

async function main() {
  const hashed = await bcrypt.hash("123456", 10);

  // ================= USERS =================
  const users = await Promise.all([
    prisma.user.upsert({
      where: { username: "ProPlayer_99" },
      update: {},
      create: {
        username: "ProPlayer_99",
        password: hashed,
        level: 42,
        coins: 12000,
        rank: "Grandmaster",
      },
    }),
    prisma.user.upsert({
      where: { username: "Rival_X" },
      update: {},
      create: {
        username: "Rival_X",
        password: hashed,
        level: 35,
        coins: 8000,
        rank: "Master",
      },
    }),
    prisma.user.upsert({
      where: { username: "NoobMaster" },
      update: {},
      create: {
        username: "NoobMaster",
        password: hashed,
        level: 10,
        coins: 2000,
        rank: "Bronze",
      },
    }),
    prisma.user.upsert({
      where: { username: "Legend27" },
      update: {},
      create: {
        username: "Legend27",
        password: hashed,
        level: 50,
        coins: 20000,
        rank: "Challenger",
      },
    }),
    prisma.user.upsert({
      where: { username: "Shadow" },
      update: {},
      create: {
        username: "Shadow",
        password: hashed,
        level: 28,
        coins: 6000,
        rank: "Diamond",
      },
    }),
  ]);

  // ================= ROOMS =================
  const rooms = await Promise.all([
    prisma.room.upsert({
      where: { code: "ROOM1" },
      update: {},
      create: {
        name: "Classic",
        code: "ROOM1",
        hostId: users[0].id,
        maxPlayers: 4,
      },
    }),
    prisma.room.upsert({
      where: { code: "ROOM2" },
      update: {},
      create: {
        name: "Pro Arena",
        code: "ROOM2",
        hostId: users[1].id,
        maxPlayers: 4,
      },
    }),
    prisma.room.upsert({
      where: { code: "ROOM3" },
      update: {},
      create: {
        name: "Fun Room",
        code: "ROOM3",
        hostId: users[2].id,
        maxPlayers: 4,
      },
    }),
    prisma.room.upsert({
      where: { code: "ROOM4" },
      update: {},
      create: {
        name: "Rank Match",
        code: "ROOM4",
        hostId: users[3].id,
        maxPlayers: 4,
      },
    }),
    prisma.room.upsert({
      where: { code: "ROOM5" },
      update: {},
      create: {
        name: "Chill Room",
        code: "ROOM5",
        hostId: users[4].id,
        maxPlayers: 4,
      },
    }),
  ]);

  // ================= PLAYERS =================
  await prisma.player.createMany({
    data: [
      { userId: users[0].id, roomId: rooms[0].id, color: "red", isReady: true },
      {
        userId: users[1].id,
        roomId: rooms[0].id,
        color: "blue",
        isReady: false,
      },
      {
        userId: users[2].id,
        roomId: rooms[1].id,
        color: "green",
        isReady: true,
      },
      {
        userId: users[3].id,
        roomId: rooms[2].id,
        color: "yellow",
        isReady: true,
      },
      {
        userId: users[4].id,
        roomId: rooms[3].id,
        color: "red",
        isReady: false,
      },
    ],
  });

  // ================= GAME INVITE NOTIFICATIONS =================
  await prisma.notification.createMany({
    data: users.map((u, i) => {
      const inviter = users[(i + 1) % users.length];
      const room = rooms[i % rooms.length];

      return {
        userId: u.id,
        type: "GAME_INVITE",
        content: `${inviter.username} mời bạn vào phòng ${room.name}`,
      };
    }),
  });
  // ================= FRIENDS =================
  await prisma.friend.createMany({
    data: [
      { userId: users[0].id, friendId: users[1].id, status: "ONLINE" },
      { userId: users[0].id, friendId: users[2].id, status: "OFFLINE" },
      { userId: users[0].id, friendId: users[3].id, status: "INGAME" },
      { userId: users[0].id, friendId: users[4].id, status: "ONLINE" },

      { userId: users[1].id, friendId: users[0].id, status: "ONLINE" },
      { userId: users[1].id, friendId: users[2].id, status: "OFFLINE" },
      { userId: users[1].id, friendId: users[3].id, status: "INGAME" },
      { userId: users[1].id, friendId: users[4].id, status: "ONLINE" },

      { userId: users[2].id, friendId: users[0].id, status: "OFFLINE" },
      { userId: users[2].id, friendId: users[1].id, status: "OFFLINE" },
      { userId: users[2].id, friendId: users[3].id, status: "INGAME" },
      { userId: users[2].id, friendId: users[4].id, status: "ONLINE" },

      { userId: users[3].id, friendId: users[0].id, status: "INGAME" },
      { userId: users[3].id, friendId: users[1].id, status: "INGAME" },
      { userId: users[3].id, friendId: users[2].id, status: "INGAME" },
      { userId: users[3].id, friendId: users[4].id, status: "ONLINE" },

      { userId: users[4].id, friendId: users[0].id, status: "INGAME" },
      { userId: users[4].id, friendId: users[1].id, status: "ONLINE" },
      { userId: users[4].id, friendId: users[2].id, status: "ONLINE" },
      { userId: users[4].id, friendId: users[3].id, status: "OFFLINE" },
    ],
  });

  // ================= FRIEND REQUEST =================
  await prisma.friendRequest.createMany({
    data: [
      { fromId: users[2].id, toId: users[0].id },
      { fromId: users[4].id, toId: users[0].id },
      { fromId: users[1].id, toId: users[2].id },
      { fromId: users[3].id, toId: users[4].id },
      { fromId: users[0].id, toId: users[3].id },
      { fromId: users[1].id, toId: users[3].id },
      { fromId: users[2].id, toId: users[3].id },
      { fromId: users[4].id, toId: users[3].id },
      { fromId: users[0].id, toId: users[4].id },
      { fromId: users[1].id, toId: users[4].id },
      { fromId: users[2].id, toId: users[4].id },
      { fromId: users[3].id, toId: users[4].id },
    ],
  });

  // ================= PUBLIC CHAT =================
  await prisma.message.createMany({
    data: [
      { content: "Ai chơi không?", fromId: users[1].id },
      { content: "Vào phòng đi!", fromId: users[0].id },
      { content: "Mình mới chơi, ai chỉ mình với?", fromId: users[2].id },
      { content: "Hello mọi người!", fromId: users[3].id },
      { content: "Mình muốn chơi cùng mọi người", fromId: users[4].id },
      { content: "Chào các bạn!", fromId: users[1].id },
      { content: "Chào buổi sáng!", fromId: users[0].id },
      { content: "Mình mới chơi, ai chỉ mình với?", fromId: users[2].id },
      { content: "Đang chờ bạn vào phòng", fromId: users[3].id },
      { content: "Mình muốn chơi cùng mọi người", fromId: users[4].id },
      { content: "Mọi người ăn cơm chưa?", fromId: users[1].id },
    ],
  });

  // ================= PRIVATE CHAT =================
  await prisma.message.createMany({
    data: [
      { content: "Hello bro", fromId: users[0].id, toId: users[1].id },
      { content: "Ok vào game", fromId: users[1].id, toId: users[0].id },
      { content: "Solo không?", fromId: users[2].id, toId: users[0].id },
      { content: "Chờ tí", fromId: users[0].id, toId: users[2].id },
      { content: "Ready chưa?", fromId: users[3].id, toId: users[0].id },
      { content: "Đang chuẩn bị", fromId: users[0].id, toId: users[3].id },
      {
        content: "Chơi cùng nhau không?",
        fromId: users[4].id,
        toId: users[0].id,
      },
      { content: "Được, vào phòng đi", fromId: users[0].id, toId: users[4].id },
      {
        content: "Muốn chơi cùng không?",
        fromId: users[1].id,
        toId: users[2].id,
      },
      { content: "Được, vào phòng đi", fromId: users[2].id, toId: users[1].id },
      { content: "Ăn cơm chưa?", fromId: users[3].id, toId: users[1].id },
      {
        content: "Chưa, đang chơi đây",
        fromId: users[1].id,
        toId: users[3].id,
      },
    ],
  });

  console.log("✅ FULL SEED DONE");
}

main()
  .catch((e) => {
    console.error("❌ Seed error:", e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
