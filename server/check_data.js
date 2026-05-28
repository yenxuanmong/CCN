require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const [users, rooms, messages, games] = await Promise.all([
    prisma.user.count(),
    prisma.room.count(),
    prisma.message.count(),
    prisma.game.count(),
  ]);
  console.log('Users   :', users);
  console.log('Rooms   :', rooms);
  console.log('Messages:', messages);
  console.log('Games   :', games);
  await prisma.$disconnect();
}
main().catch(console.error);
