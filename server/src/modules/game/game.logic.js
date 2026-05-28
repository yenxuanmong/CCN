const prisma = require("../../config/db");

// ─── Cấu hình bàn cờ ─────────────────────────────────────────────
const TOTAL_CELLS = 60;
const FINISH_POS  = 67;   // pos 61-66 = hành lang bước 1-6, pos 67 = đích

const SPECIAL_TILES = {
  3:'lucky',  18:'lucky',  33:'lucky',  48:'lucky',  10:'lucky',
  6:'unlucky',21:'unlucky',36:'unlucky',51:'unlucky',13:'unlucky',
  9:'stun',   24:'stun',   39:'stun',   54:'stun',   16:'stun',
  2:'minigame', 4:'minigame', 7:'minigame',11:'minigame',
  14:'minigame',17:'minigame',20:'minigame',23:'minigame',
  26:'minigame',29:'minigame',32:'minigame',35:'minigame',
  38:'minigame',41:'minigame',44:'minigame',47:'minigame',
  50:'minigame',53:'minigame',56:'minigame',59:'minigame',
};

// Khớp với game_engine.js: Blue=0, Red=15, Yellow=30, Green=45
const START_POSITIONS = { blue: 0, red: 15, yellow: 30, green: 45 };

// ─── Init ─────────────────────────────────────────────────────────
function initGameState(players) {
  return {
    turnIndex: 0,
    dice: null,
    players: players.map((p) => ({
      playerId:  p.id,
      userId:    p.userId,
      color:     p.color,
      // pos: 0=chuồng, 1-52=path, 53-58=hành lang(1-6), 59=đích
      positions: [0, 0, 0, 0],
      finished:  0,
      stunned:   false,
    })),
    status: "PLAYING",
    tileEffect: null,
  };
}

// ─── Roll Dice ────────────────────────────────────────────────────
function rollDice(state, playerId) {
  const current = state.players[state.turnIndex];
  if (current.playerId !== playerId) throw new Error("Not your turn");

  if (current.stunned) {
    current.stunned = false;
    state.dice = 0;
    state.turnIndex = (state.turnIndex + 1) % state.players.length;
    return { state, dice: 0, skipped: true };
  }

  const dice = Math.floor(Math.random() * 6) + 1;
  state.dice = dice;
  return { state, dice };
}

// ─── Move Horse ───────────────────────────────────────────────────
function moveHorse(state, playerId, horseIndex) {
  const current = state.players[state.turnIndex];
  if (current.playerId !== playerId) throw new Error("Not your turn");
  if (!state.dice) throw new Error("Roll dice first");

  let pos = current.positions[horseIndex];
  const dice = state.dice;

  // Ra chuồng cần xúc xắc = 6
  if (pos === 0) {
    if (dice === 6) pos = 1;
    else throw new Error("Cannot move");
  } else if (pos <= 60) {
    // Đang trên path vòng ngoài
    const newPos = pos + dice;
    if (newPos > 60) {
      const stepsIntoLane = newPos - 60;
      if (stepsIntoLane > 6) throw new Error("Cannot move — overshoot finish");
      pos = 60 + stepsIntoLane; // 61-66
      if (pos >= 66) { pos = 67; current.finished += 1; }
    } else {
      pos = newPos;
    }
  } else if (pos >= 61 && pos < 67) {
    // Đang trong hành lang
    const newPos = pos + dice;
    if (newPos > 67) throw new Error("Cannot move — overshoot finish");
    pos = newPos;
    if (pos >= 67) { pos = 67; current.finished += 1; }
  } else {
    throw new Error("Cannot move");
  }

  current.positions[horseIndex] = pos;
  state.tileEffect = null;

  // ─── Hiệu ứng ô đặc biệt (chỉ khi trên path vòng ngoài) ────────
  if (pos >= 1 && pos <= 60) {
    const start   = START_POSITIONS[current.color] || 0;
    const absCell = (start + pos - 1) % TOTAL_CELLS;
    const tileType = SPECIAL_TILES[absCell];

    if (tileType === 'lucky') {
      const bonus = Math.floor(Math.random() * 6) + 1;
      const newPos2 = pos + bonus;
      if (newPos2 <= 60) {
        pos = newPos2;
      } else {
        const into = newPos2 - 60;
        pos = into <= 6 ? 60 + into : 67;
        if (pos >= 67) { pos = 67; current.finished += 1; }
      }
      current.positions[horseIndex] = pos;
      state.tileEffect = { type: 'lucky', bonus, playerId };

    } else if (tileType === 'unlucky') {
      const penalty = Math.floor(Math.random() * 6) + 1;
      pos = Math.max(pos - penalty, 1);
      current.positions[horseIndex] = pos;
      state.tileEffect = { type: 'unlucky', penalty, playerId };

    } else if (tileType === 'stun') {
      current.stunned = true;
      state.tileEffect = { type: 'stun', playerId };

    } else if (tileType === 'minigame') {
      state.tileEffect = { type: 'minigame', playerId };
    }
  }

  // ─── Ăn quân đối thủ (chỉ trên path vòng ngoài) ─────────────────
  if (pos >= 1 && pos <= 60) {
    const myStart  = START_POSITIONS[current.color] || 0;
    const myAbs    = (myStart + pos - 1) % TOTAL_CELLS;
    state.players.forEach((p) => {
      if (p.playerId === playerId) return;
      const enemyStart = START_POSITIONS[p.color] || 0;
      p.positions = p.positions.map((ep) => {
        if (ep < 1 || ep > 60) return ep;
        const enemyAbs = (enemyStart + ep - 1) % TOTAL_CELLS;
        return enemyAbs === myAbs ? 0 : ep;
      });
    });
  }

  // ─── Chuyển lượt ─────────────────────────────────────────────────
  if (dice !== 6 || pos >= 67) {
    state.turnIndex = (state.turnIndex + 1) % state.players.length;
  }
  state.dice = null;

  // ─── Kiểm tra thắng ──────────────────────────────────────────────
  if (current.finished === 4) {
    state.status = "FINISHED";
    state.winner = playerId;
  }

  return state;
}

module.exports = {
  initGameState, rollDice, moveHorse,
  SPECIAL_TILES, START_POSITIONS, TOTAL_CELLS,
};
