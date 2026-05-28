/**
 * bot.service.js
 * Xử lý logic AI cho người chơi máy (bot) trong game Ludo.
 * Bot có User record thật trong DB (username bắt đầu bằng "bot_")
 * để thoả mãn foreign key constraint Player.userId → User.id
 *
 * Chiến lược AI (theo thứ tự ưu tiên):
 *   1. Đưa quân vào đích nếu có thể
 *   2. Ăn quân đối thủ nếu có thể
 *   3. Di chuyển quân đang trên bàn xa nhất
 *   4. Ra chuồng nếu được 6
 */

const prisma = require("../config/db");
const gameLogic = require("../modules/game/game.logic");

const BOT_USERNAME_PREFIX = "bot_";
const BOT_DISPLAY_NAMES   = ["Bot Alpha", "Bot Beta", "Bot Gamma", "Bot Delta"];

/** Kiểm tra một username có phải bot không */
function isBotUsername(username) {
  return typeof username === "string" && username.startsWith(BOT_USERNAME_PREFIX);
}

/** Kiểm tra một userId (User.id) có phải bot không — cần query DB */
async function isBotUserId(userId) {
  if (!userId) return false;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { username: true },
  });
  return user ? isBotUsername(user.username) : false;
}

/** Kiểm tra sync từ state player (dùng field isBot đã được gắn khi createGame) */
function isBotPlayer(statePlayer) {
  return statePlayer?.isBot === true;
}

/**
 * Upsert User record cho bot và trả về User.id
 * @param {string} botUsername - username duy nhất, bắt đầu bằng "bot_"
 * @param {string} displayName
 */
async function getOrCreateBotUser(botUsername, displayName) {
  const user = await prisma.user.upsert({
    where:  { username: botUsername },
    update: {},
    create: {
      username:    botUsername,
      displayName: displayName,
      password:    "BOT_NO_LOGIN",
      level:       1,
    },
  });
  return user;
}

/**
 * Tạo các bot player để lấp đầy phòng đến đủ targetCount người.
 * @param {string} roomId
 * @param {number} targetCount - số người chơi mong muốn (mặc định 2)
 * @returns {string[]} danh sách User.id của bot đã tạo
 */
async function fillRoomWithBots(roomId, targetCount = 2) {
  const existing = await prisma.player.count({ where: { roomId } });
  const needed   = Math.max(0, targetCount - existing);
  if (needed === 0) return [];

  const colors = ["blue", "red", "green", "yellow"];
  const usedColors = await prisma.player
    .findMany({ where: { roomId }, select: { color: true } })
    .then((ps) => ps.map((p) => p.color));

  // Đếm bot hiện có trong phòng để đặt tên đúng
  const existingBotCount = await prisma.player.findMany({
    where: { roomId },
    include: { user: { select: { username: true } } },
  }).then((ps) => ps.filter((p) => isBotUsername(p.user?.username)).length);

  const createdIds = [];

  for (let i = 0; i < needed; i++) {
    const botIndex   = existingBotCount + i;
    const botUsername = BOT_USERNAME_PREFIX + roomId.slice(0, 8) + "_" + botIndex;
    const displayName = BOT_DISPLAY_NAMES[botIndex] || "Bot " + (botIndex + 1);
    const availColor  = colors.find((c) => !usedColors.includes(c)) || colors[(existing + i) % 4];

    const botUser = await getOrCreateBotUser(botUsername, displayName);

    const alreadyIn = await prisma.player.findFirst({ where: { userId: botUser.id, roomId } });
    if (!alreadyIn) {
      await prisma.player.create({
        data: { userId: botUser.id, roomId, color: availColor, isReady: true },
      });
      usedColors.push(availColor);
    }

    createdIds.push(botUser.id);
  }

  return createdIds;
}

/**
 * Chọn quân tốt nhất để di chuyển (AI logic)
 * @param {object} state - game state
 * @param {string} playerId - Player.id của bot
 * @returns {number} horseIndex (0-3)
 */
function chooseBestMove(state, playerId) {
  const botPlayer = state.players.find((p) => p.playerId === playerId);
  if (!botPlayer) return 0;

  const dice      = state.dice;
  const positions = botPlayer.positions;

  // Tìm các quân có thể di chuyển
  const movable = [];
  for (let i = 0; i < 4; i++) {
    const pos = positions[i];
    if (pos === 0 && dice === 6)       movable.push({ i, pos, newPos: 1 });
    else if (pos > 0 && pos < 57)      movable.push({ i, pos, newPos: Math.min(pos + dice, 57) });
  }

  if (movable.length === 0) return 0;

  // Ưu tiên 1: đưa quân vào đích
  const finisher = movable.find((m) => m.newPos >= 57);
  if (finisher) return finisher.i;

  // Ưu tiên 2: ăn quân đối thủ
  const enemyPositions = new Set();
  state.players.forEach((p) => {
    if (p.playerId !== playerId) {
      p.positions.forEach((ep) => { if (ep > 0 && ep < 57) enemyPositions.add(ep); });
    }
  });
  const attacker = movable.find((m) => enemyPositions.has(m.newPos));
  if (attacker) return attacker.i;

  // Ưu tiên 3: di chuyển quân đang trên bàn xa nhất
  const onBoard = movable.filter((m) => m.pos > 0);
  if (onBoard.length > 0) {
    onBoard.sort((a, b) => b.pos - a.pos);
    return onBoard[0].i;
  }

  // Ưu tiên 4: ra chuồng
  return movable[0].i;
}

/**
 * Thực hiện lượt chơi của bot: roll dice → chọn quân → move
 * @param {string} gameId
 * @param {string} playerId - Player.id của bot
 * @returns {object} newState
 */
async function playBotTurn(gameId, playerId) {
  const game = await prisma.game.findUnique({ where: { id: gameId } });
  if (!game) throw new Error("Game not found");

  let state = game.state;

  // Kiểm tra đúng lượt bot
  const current = state.players[state.turnIndex];
  if (current.playerId !== playerId) return state;

  // Roll dice
  const rollResult = gameLogic.rollDice(state, playerId);
  state = rollResult.state;

  // Chọn quân tốt nhất
  const horseIndex = chooseBestMove(state, playerId);

  // Move
  try {
    state = gameLogic.moveHorse(state, playerId, horseIndex);
  } catch {
    // Không có quân nào di chuyển được → bỏ lượt
    state.dice      = null;
    state.turnIndex = (state.turnIndex + 1) % state.players.length;
  }

  await prisma.game.update({ where: { id: gameId }, data: { state } });
  return state;
}

/**
 * Kiểm tra lượt hiện tại có phải bot không và trả về playerId nếu có
 * @param {object} state
 * @returns {string|null}
 */
function getCurrentBotPlayerId(state) {
  if (!state || state.status === "FINISHED") return null;
  const current = state.players[state.turnIndex];
  if (!current) return null;
  return isBotPlayer(current) ? current.playerId : null;
}

module.exports = {
  isBotUsername,
  isBotUserId,
  isBotPlayer,
  fillRoomWithBots,
  playBotTurn,
  getCurrentBotPlayerId,
  chooseBestMove,
  BOT_USERNAME_PREFIX,
  BOT_DISPLAY_NAMES,
};
