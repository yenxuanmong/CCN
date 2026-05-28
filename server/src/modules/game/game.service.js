const prisma = require("../../config/db");
const { initGameState } = require("./game.logic");
const { isBotUsername, BOT_DISPLAY_NAMES, fillRoomWithBots } = require("../../services/bot.service");

async function createGame(roomId) {
  // Nếu phòng chỉ có 1 người thật, tự động thêm bot để đủ 2 người tối thiểu
  const allPlayers = await prisma.player.findMany({
    where: { roomId },
    include: { user: { select: { username: true } } },
  });
  const humanCount = allPlayers.filter((p) => !isBotUsername(p.user?.username)).length;
  if (humanCount < 2) {
    await fillRoomWithBots(roomId, 2);
  }

  const players = await prisma.player.findMany({
    where: { roomId },
    include: { user: { select: { username: true, displayName: true } } },
  });

  const state = initGameState(players);

  // Gắn username + isBot vào state để frontend hiển thị và nhận diện bot
  let botNameIndex = 0;
  state.players = state.players.map((sp, i) => {
    const isBot = isBotUsername(players[i]?.user?.username);
    return {
      ...sp,
      username: isBot
        ? (players[i]?.user?.displayName || BOT_DISPLAY_NAMES[botNameIndex++] || "Bot")
        : (players[i]?.user?.username || "Player " + (i + 1)),
      isBot,
    };
  });

  // Nếu phòng đã có game cũ (unique constraint roomId) → xóa để tạo lại
  const existingGame = await prisma.game.findUnique({ where: { roomId } });
  if (existingGame) {
    await prisma.player.updateMany({ where: { gameId: existingGame.id }, data: { gameId: null } });
    await prisma.move.deleteMany({ where: { gameId: existingGame.id } });
    await prisma.game.delete({ where: { id: existingGame.id } });
  }

  const game = await prisma.game.create({
    data: { roomId, state },
  });

  await prisma.player.updateMany({
    where: { roomId },
    data: { gameId: game.id },
  });

  return game;
}

async function getGame(gameId) {
  const game = await prisma.game.findUnique({
    where: { id: gameId },
    include: {
      players: {
        include: {
          user: { select: { id: true, username: true, displayName: true, avatar: true, level: true } },
        },
      },
    },
  });

  if (!game) return null;

  let botNameIndex = 0;
  if (game.state && game.state.players) {
    game.state.players = game.state.players.map((sp) => {
      const player = game.players.find((p) => p.id === sp.playerId);
      const isBot = isBotUsername(player?.user?.username);
      return {
        ...sp,
        isBot,
        username: isBot
          ? (sp.username || player?.user?.displayName || BOT_DISPLAY_NAMES[botNameIndex++] || "Bot")
          : (player?.user?.username || sp.username || "Player"),
        avatar: isBot ? null : (player?.user?.avatar || null),
      };
    });
  }

  return game;
}

module.exports = { createGame, getGame };
