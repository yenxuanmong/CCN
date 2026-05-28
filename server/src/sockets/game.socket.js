const prisma = require("../config/db");
const gameLogic = require("../modules/game/game.logic");
const botService = require("../services/bot.service");

/**
 * Resolve playerId: có thể là Player.id hoặc User.id
 */
async function resolvePlayerId(gameId, rawId) {
  const byPlayerId = await prisma.player.findFirst({ where: { id: rawId, gameId } });
  if (byPlayerId) return byPlayerId.id;

  const byUserId = await prisma.player.findFirst({ where: { userId: rawId, gameId } });
  if (byUserId) return byUserId.id;

  const game = await prisma.game.findUnique({ where: { id: gameId }, select: { roomId: true } });
  if (game?.roomId) {
    const byRoom = await prisma.player.findFirst({ where: { userId: rawId, roomId: game.roomId } });
    if (byRoom) return byRoom.id;
  }

  return rawId;
}

/**
 * Sau mỗi lượt người thật, kiểm tra và chạy tất cả lượt bot liên tiếp
 * Bot đi với delay nhỏ để frontend có thể animate
 */
async function runBotTurnsIfNeeded(io, gameId) {
  let safetyCounter = 0;
  const maxBotTurns = 16; // tối đa 4 bot × 4 lượt liên tiếp

  const runNext = async () => {
    safetyCounter++;
    if (safetyCounter > maxBotTurns) return;

    const game = await prisma.game.findUnique({ where: { id: gameId } });
    if (!game || game.state?.status === "FINISHED") return;

    // getCurrentBotPlayerId dùng field isBot trong state (không cần query players)
    const botPlayerId = botService.getCurrentBotPlayerId(game.state);
    if (!botPlayerId) return;

    await new Promise((r) => setTimeout(r, 1200));

    try {
      const newState = await botService.playBotTurn(gameId, botPlayerId);
      const botPlayer = newState.players.find((p) => p.playerId === botPlayerId);

      io.to(gameId).emit("state_updated", newState);
      io.to(gameId).emit("bot_moved", {
        playerId: botPlayerId,
        username: botPlayer?.username || "Bot",
      });

      if (newState.status === "FINISHED") {
        io.to(gameId).emit("game_over", { winner: newState.winner });
        return;
      }

      await runNext();
    } catch (err) {
      console.error("[Bot] playBotTurn error:", err.message);
    }
  };

  setTimeout(runNext, 800);
}

module.exports = (io, socket) => {
  socket.on("join_game", async ({ gameId, userId }) => {
    socket.join(gameId);
    console.log(`[Game] User ${userId} joined game room ${gameId}`);
  });

  socket.on("roll_dice", async ({ gameId, playerId: rawPlayerId }) => {
    try {
      socket.join(gameId);

      const game = await prisma.game.findUnique({ where: { id: gameId } });
      if (!game) return socket.emit("error", "Game not found");

      const playerId = await resolvePlayerId(gameId, rawPlayerId);
      const state    = game.state;
      const result   = gameLogic.rollDice(state, playerId);

      await prisma.game.update({ where: { id: gameId }, data: { state: result.state } });

      io.to(gameId).emit("dice_rolled", result);
    } catch (err) {
      console.error("roll_dice error:", err.message);
      socket.emit("error", err.message);
    }
  });

  socket.on("move_horse", async ({ gameId, playerId: rawPlayerId, horseIndex }) => {
    try {
      socket.join(gameId);

      const game = await prisma.game.findUnique({ where: { id: gameId } });
      if (!game) return socket.emit("error", "Game not found");

      const playerId = await resolvePlayerId(gameId, rawPlayerId);
      const state    = game.state;
      const newState = gameLogic.moveHorse(state, playerId, horseIndex);

      await prisma.game.update({ where: { id: gameId }, data: { state: newState } });

      io.to(gameId).emit("state_updated", newState);

      // Log move (non-critical)
      await prisma.move.create({
        data: { gameId, playerId, action: "move", data: { horseIndex, state: newState } },
      }).catch(() => {});

      // Kiểm tra game kết thúc
      if (newState.status === "FINISHED") {
        io.to(gameId).emit("game_over", { winner: newState.winner });
        return;
      }

      // Chạy lượt bot nếu lượt tiếp theo là bot
      runBotTurnsIfNeeded(io, gameId);
    } catch (err) {
      console.error("move_horse error:", err.message);
      socket.emit("error", err.message);
    }
  });
};
