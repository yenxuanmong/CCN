/* ===== GAME UI & CONTROLLER - Connected to Node.js Backend ===== */

let currentUser;
let gameId;
let myPlayerId;
let canRoll = false;
let isAnimating = false;

const DICE_FACES = ['', '⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];

const DEMO_PLAYERS = [
  { username: 'ProPlayer_99', color: 'blue',   isMe: true,  id: 'p1' },
  { username: 'NeonRider',    color: 'red',    isMe: false, id: 'p2' },
  { username: 'LudoKing',     color: 'green',  isMe: false, id: 'p3' },
  { username: 'StarPlayer',   color: 'yellow', isMe: false, id: 'p4' }
];

document.addEventListener('DOMContentLoaded', async () => {
  // Guard: must be logged in
  if (!requireAuth()) return;

  currentUser = Auth.getUser();
  // Dùng Player record ID (lưu sau join_room), fallback về userId
  myPlayerId  = Auth.getPlayerId() || currentUser.id;
  gameId      = window.location.pathname.split('/').pop();

  initGameUI();
  BoardRenderer.init('gameCanvas');
  PieceRenderer.init('piecesLayer');

  // Connect socket to Node.js backend và join game room
  SocketClient.connect();
  SocketClient.emit('join_game', { gameId, userId: currentUser.id });
  bindSocketEvents();

  // Load game state
  await loadGameState();

  addActionLog('Game started! Turn: ' + GameState.getCurrentPlayer().username, 'blue');
});

function initGameUI() {
  const u = currentUser;
  const initial = (u.username || 'P').charAt(0).toUpperCase();
  const el = (id) => document.getElementById(id);
  if (el('gameAvatar'))   el('gameAvatar').textContent   = initial;
  if (el('gameUsername')) el('gameUsername').textContent = u.username || 'Player';
}

// ==================== LOAD GAME STATE ====================

async function loadGameState() {
  try {
    // Thử load game state từ backend
    const game = await API.getGame(gameId);
    if (game && game.state) {
      initGameFromBackend(game);
    } else {
      initDemoGame();
    }
  } catch (err) {
    console.warn('Cannot load game state from backend, using demo:', err.message);
    initDemoGame();
  }
}

function initGameFromBackend(game) {
  const state   = game.state;
  const colors  = ['blue', 'red', 'green', 'yellow'];

  // Map backend players → local players
  const players = (state.players || []).map((bp, i) => ({
    id:             bp.playerId,
    userId:         bp.userId,
    username:       bp.username || ('Player ' + (i + 1)),
    color:          bp.color    || colors[i],
    isMe:           bp.playerId === myPlayerId || bp.userId === currentUser.id,
    pieces:         bp.positions.map((pos, pi) => ({
      id:     pi,
      status: pos === 0 ? 'home' : pos >= 57 ? 'finished' : 'active',
      pos:    pos === 0 ? -1 : pos >= 57 ? 57 : pos - 1,
    })),
    finishedCount:  bp.finished || 0,
    stunned:        false,
  }));

  GameState.init(players);
  GameState.currentTurn = state.turnIndex || 0;
  PieceRenderer.renderAll(GameState.players);
  updatePlayersStatus();
  updateTurnUI();

  const me = GameState.players.find(p => p.isMe);
  canRoll = me && GameState.currentTurn === GameState.players.indexOf(me);
  const rollBtn = document.getElementById('rollBtn');
  if (rollBtn) rollBtn.disabled = !canRoll;
}

function initDemoGame() {
  const colors = ['blue', 'red', 'green', 'yellow'];
  const players = DEMO_PLAYERS.map((p, i) => ({
    ...p,
    color: colors[i],
    isMe: (p.id === myPlayerId) || (i === 0)
  }));

  GameState.init(players);
  PieceRenderer.renderAll(GameState.players);
  updatePlayersStatus();
  updateTurnUI();
  canRoll = true;

  const rollBtn = document.getElementById('rollBtn');
  if (rollBtn) rollBtn.disabled = false;
}

// ==================== SOCKET EVENTS (Backend) ====================

function bindSocketEvents() {
  // Backend emits: dice_rolled { state, dice }
  // state = { turnIndex, dice, players[{ playerId, color, positions[4], finished }], status }
  SocketClient.on('dice_rolled', (data) => {
    const diceVal = data.dice || data.value;
    if (diceVal) {
      if (data.state) syncStateFromBackend(data.state);
      showDiceResult(diceVal);
    }
  });

  // Backend emits: state_updated (after move_horse)
  SocketClient.on('state_updated', (state) => {
    syncStateFromBackend(state);
    PieceRenderer.renderAll(GameState.players);
    updatePlayersStatus();
    updateTurnUI();

    if (state.status === 'FINISHED' && state.winner) {
      const winner = GameState.players.find(p => p.id === state.winner);
      if (winner) setTimeout(() => showWinner(winner), 500);
    }
  });

  SocketClient.on('player_joined', (data) => {
    addActionLog((data.userId || 'Player') + ' joined the game', 'blue');
  });

  SocketClient.on('error', (msg) => {
    const text = typeof msg === 'string' ? msg : (msg.message || 'Server error');
    showToast(text, 'error');
    canRoll = true;
    isAnimating = false;
    const rollBtn = document.getElementById('rollBtn');
    if (rollBtn) rollBtn.disabled = false;
  });
}

/**
 * Sync local GameState with backend state.
 * Backend positions: 0 = home, 1-56 = on board, 57 = finished
 * Local positions:   -1 = home, 0-51 = path, 52-57 = finish lane
 */
function syncStateFromBackend(backendState) {
  if (!backendState || !backendState.players) return;

  backendState.players.forEach((bp, i) => {
    const localPlayer = GameState.players[i];
    if (!localPlayer) return;

    bp.positions.forEach((pos, pieceIdx) => {
      const piece = localPlayer.pieces[pieceIdx];
      if (!piece) return;

      if (pos === 0) {
        piece.status = 'home';
        piece.pos    = -1;
      } else if (pos >= 57) {
        piece.status = 'finished';
        piece.pos    = 57;
      } else {
        piece.status = 'active';
        piece.pos    = pos - 1; // backend 1-based → local 0-based
      }
    });

    localPlayer.finishedCount = bp.finished || 0;
  });

  GameState.currentTurn = backendState.turnIndex || 0;
  GameState.diceValue   = backendState.dice || 0;
}

// ==================== DICE ====================

function rollDice() {
  if (!canRoll || isAnimating) return;

  canRoll     = false;
  isAnimating = true;
  AudioManager.playDice();

  const diceEl  = document.getElementById('diceDisplay');
  const rollBtn = document.getElementById('rollBtn');
  if (rollBtn) rollBtn.disabled = true;

  // Animate dice rolling locally
  let rollCount = 0;
  const rollInterval = setInterval(() => {
    const tempVal = Math.floor(Math.random() * 6) + 1;
    if (diceEl) diceEl.textContent = DICE_FACES[tempVal];
    rollCount++;

    if (rollCount >= 8) {
      clearInterval(rollInterval);

      // Send roll_dice to backend: { gameId, playerId }
      // Backend will emit back 'dice_rolled' with { state, dice }
      SocketClient.rollDice(gameId);

      // Fallback: if backend doesn't respond in 1.5s, handle locally
      setTimeout(() => {
        if (isAnimating) {
          const localVal = Math.floor(Math.random() * 6) + 1;
          showDiceResult(localVal);
        }
      }, 1500);
    }
  }, 80);
}

function showDiceResult(value) {
  const diceEl = document.getElementById('diceDisplay');
  if (diceEl) {
    diceEl.textContent = DICE_FACES[value];
    diceEl.style.animation = 'bounceIn 0.3s ease';
    setTimeout(() => { diceEl.style.animation = ''; }, 300);
  }

  GameState.diceValue  = value;
  GameState.diceRolled = true;
  isAnimating = false;

  const player = GameState.getCurrentPlayer();
  addActionLog(player.username + ' rolled ' + value, player.color);

  if (value === 6) {
    AudioManager.playLucky();
    speakVoiceLine('roll6');
    PieceRenderer.showFloatText(260, 200, '🎉 Số 6!', '#fbbf24');
  }

  const movable = getMovablePieces(player, value);

  if (movable.length === 0) {
    addActionLog(player.username + ' has no moves', 'gray');
    setTimeout(() => endTurn(), 1200);
  } else if (movable.length === 1) {
    setTimeout(() => movePiece(player, movable[0], value), 600);
  } else {
    showPieceSelection(player, movable, value);
  }
}

// ==================== MOVE ====================

function getMovablePieces(player, diceVal) {
  const movable = [];
  player.pieces.forEach(piece => {
    if (piece.status === 'finished') return;
    if (piece.status === 'home' && diceVal === 6) movable.push(piece);
    else if (piece.status === 'active' && piece.pos + diceVal <= 57) movable.push(piece);
  });
  return movable;
}

function showPieceSelection(player, movable, diceVal) {
  const panel     = document.getElementById('pieceSelection');
  const container = document.getElementById('movablePieces');
  if (!panel || !container) return;

  panel.style.display = 'block';
  container.innerHTML = movable.map(piece => {
    const bg = COLORS[player.color].main;
    return '<button onclick="selectPiece(' + piece.id + ',' + diceVal + ')" ' +
      'style="width:44px;height:44px;border-radius:50%;border:3px solid white;background:' + bg + ';' +
      'color:white;font-size:16px;cursor:pointer;font-weight:700;transition:transform 0.2s;" ' +
      'onmouseover="this.style.transform=\'scale(1.2)\'" onmouseout="this.style.transform=\'scale(1)\'">🐴</button>';
  }).join('');
}

function selectPiece(pieceId, diceVal) {
  const panel = document.getElementById('pieceSelection');
  if (panel) panel.style.display = 'none';

  const player = GameState.getCurrentPlayer();
  const piece  = player.pieces[pieceId];
  if (piece) movePiece(player, piece, diceVal);
}

function movePiece(player, piece, steps) {
  const panel = document.getElementById('pieceSelection');
  if (panel) panel.style.display = 'none';

  isAnimating = true;

  // Send move_horse to backend: { gameId, playerId, horseIndex }
  // Backend will emit back 'state_updated' with new state
  SocketClient.moveHorse(gameId, piece.id);

  // Optimistic local update
  let extraTurn = false;

  if (piece.status === 'home' && steps === 6) {
    piece.status = 'active';
    piece.pos    = 0;
    addActionLog(player.username + ' deployed a piece!', player.color);
    AudioManager.playMove();
    extraTurn = true;
  } else if (piece.status === 'active') {
    const newPos = piece.pos + steps;
    if (newPos >= 57) {
      piece.status = 'finished';
      piece.pos    = 57;
      player.finishedCount++;
      addActionLog(player.username + ' finished piece ' + (piece.id + 1) + '! 🏆', player.color);
      AudioManager.playWin();
      speakVoiceLine('win');
      PieceRenderer.showFloatText(260, 200, '🏆 Về đích!', '#fbbf24');
    } else {
      piece.pos = newPos;
    }
  }

  // Check special tiles
  if (piece.status === 'active' && piece.pos < 52) {
    const absPos = GameState.getAbsolutePosition(player.color, piece.pos);
    checkSpecialTile(player, piece, absPos);
  }

  // Check captures
  if (piece.status === 'active' && piece.pos < 52) {
    checkCapture(player, piece);
  }

  PieceRenderer.renderAll(GameState.players);
  AudioManager.playMove();

  setTimeout(() => {
    isAnimating = false;
    updatePlayersStatus();

    if (steps === 6 || extraTurn) {
      canRoll = true;
      const rollBtn = document.getElementById('rollBtn');
      if (rollBtn) rollBtn.disabled = false;
      addActionLog(player.username + ' gets another turn!', player.color);
    } else {
      endTurn();
    }
  }, 600);
}

function checkSpecialTile(player, piece, absPos) {
  const tileType = SPECIAL_TILES[absPos];
  if (!tileType) return;

  switch (tileType) {
    case 'lucky':
      piece.pos = Math.min(piece.pos + 3, 51);
      addActionLog(player.username + ' hit lucky tile! +3 steps 🌟', player.color);
      AudioManager.playLucky();
      speakVoiceLine('lucky');
      PieceRenderer.showFloatText(260, 200, '⭐ +3 bước!', '#fbbf24');
      break;
    case 'unlucky':
      piece.pos = Math.max(piece.pos - 3, 0);
      addActionLog(player.username + ' hit unlucky tile! -3 steps 💀', 'red');
      AudioManager.playError();
      speakVoiceLine('unlucky');
      PieceRenderer.showFloatText(260, 200, '💀 -3 bước!', '#ef4444');
      break;
    case 'stun':
      addActionLog(player.username + ' is stunned! Skip next turn 😵', 'red');
      player.stunned = true;
      PieceRenderer.showFloatText(260, 200, '😵 Choáng!', '#a855f7');
      break;
    case 'minigame':
      addActionLog(player.username + ' triggered a Mini-game! 🎮', 'green');
      setTimeout(() => MiniGameManager.startRandom(), 500);
      break;
  }
}

function checkCapture(attacker, attackerPiece) {
  const attackerAbsPos = GameState.getAbsolutePosition(attacker.color, attackerPiece.pos);
  const safePositions  = [0, 8, 13, 21, 26, 34, 39, 47];
  if (safePositions.includes(attackerAbsPos)) return;

  GameState.players.forEach(defender => {
    if (defender.color === attacker.color) return;
    defender.pieces.forEach(defPiece => {
      if (defPiece.status !== 'active') return;
      const defAbsPos = GameState.getAbsolutePosition(defender.color, defPiece.pos);
      if (defAbsPos === attackerAbsPos) {
        defPiece.status = 'home';
        defPiece.pos    = -1;
        const pos = BoardRenderer.getGridPos(attackerAbsPos);
        if (pos) PieceRenderer.showCaptureEffect(pos.x, pos.y);
        addActionLog(attacker.username + ' captured ' + defender.username + "'s piece! 💥", attacker.color);
        AudioManager.playCapture();
        speakVoiceLine('capture');
      }
    });
  });
}

// ==================== TURN MANAGEMENT ====================

function endTurn() {
  GameState.nextTurn();

  const player = GameState.getCurrentPlayer();
  if (player.stunned) {
    player.stunned = false;
    addActionLog(player.username + ' skips turn (stunned)', 'gray');
    GameState.nextTurn();
  }

  updateTurnUI();
  updatePlayersStatus();

  const current = GameState.getCurrentPlayer();
  if (!current.isMe) {
    setTimeout(() => aiTurn(current), 1200);
  } else {
    canRoll = true;
    const rollBtn = document.getElementById('rollBtn');
    if (rollBtn) rollBtn.disabled = false;
  }
}

function aiTurn(player) {
  addActionLog(player.username + ' is thinking...', player.color);
  const diceVal = Math.floor(Math.random() * 6) + 1;

  setTimeout(() => {
    showDiceResult(diceVal);
    const movable = getMovablePieces(player, diceVal);
    if (movable.length > 0) {
      const best = movable.reduce((b, p) => {
        if (p.status === 'active' && (b.status === 'home' || p.pos > b.pos)) return p;
        return b;
      }, movable[0]);
      setTimeout(() => movePiece(player, best, diceVal), 800);
    }
  }, 800);
}

// ==================== UI UPDATES ====================

function updateTurnUI() {
  const player     = GameState.getCurrentPlayer();
  const turnAvatar = document.getElementById('turnAvatar');
  const turnName   = document.getElementById('turnPlayerName');
  const rollBtn    = document.getElementById('rollBtn');

  if (turnAvatar) {
    turnAvatar.textContent      = player.username.charAt(0);
    turnAvatar.style.background = 'linear-gradient(135deg,' + COLORS[player.color].main + ',' + COLORS[player.color].dark + ')';
  }
  if (turnName) turnName.textContent = player.username;
  if (rollBtn) {
    rollBtn.disabled      = !player.isMe;
    rollBtn.style.opacity = player.isMe ? '1' : '0.5';
  }
}

function updatePlayersStatus() {
  const container = document.getElementById('playersStatus');
  if (!container) return;

  container.innerHTML = GameState.players.map((p, i) => {
    const isActive = (i === GameState.currentTurn);
    const dots = p.pieces.map(piece => {
      const cls = piece.status === 'finished' ? 'finished' : piece.status === 'active' ? 'active' : 'home';
      const shadow = cls === 'finished' ? 'box-shadow:0 0 4px ' + COLORS[p.color].main + ';' : '';
      return '<div class="piece-mini ' + cls + '" style="background:' + COLORS[p.color].main + ';' + shadow + '"></div>';
    }).join('');

    return '<div class="player-status-card ' + (isActive ? 'active' : '') + ' ' + (p.finishedCount >= 4 ? 'finished' : '') + '">' +
      '<div class="avatar avatar-sm" style="background:linear-gradient(135deg,' + COLORS[p.color].main + ',' + COLORS[p.color].dark + ');font-size:12px;">' + p.username.charAt(0) + '</div>' +
      '<div style="flex:1;">' +
        '<div style="font-size:12px;font-weight:700;display:flex;align-items:center;gap:6px;">' + p.username +
          (isActive ? '<span style="font-size:10px;color:#6c8fff;">● Turn</span>' : '') +
          (p.finishedCount >= 4 ? '<span style="font-size:10px;color:#fbbf24;">🏆</span>' : '') +
        '</div>' +
        '<div class="player-pieces-mini" style="margin-top:4px;">' + dots + '</div>' +
      '</div>' +
      '<div style="font-size:11px;color:#8b8fa8;">' + p.finishedCount + '/4 🏠</div>' +
    '</div>';
  }).join('');
}

function addActionLog(text, color) {
  color = color || 'blue';
  const log = document.getElementById('actionLog');
  if (!log) return;

  const colorMap = { blue: '#6c8fff', red: '#ff4d6d', green: '#4ade80', yellow: '#fbbf24', gray: '#8b8fa8' };
  const item = document.createElement('div');
  item.className = 'log-item';
  item.innerHTML = '<div class="log-dot" style="background:' + (colorMap[color] || '#8b8fa8') + ';"></div>' +
    '<span style="font-size:12px;color:#d1d5db;">' + text + '</span>';
  log.insertBefore(item, log.firstChild);

  while (log.children.length > 10) log.removeChild(log.lastChild);
}

function showWinner(player) {
  const modal  = document.getElementById('winModal');
  const nameEl = document.getElementById('winnerName');
  if (nameEl) nameEl.textContent = '🎉 ' + player.username + ' wins!';
  if (modal)  modal.classList.add('active');
  AudioManager.playWin();
  speakVoiceLine('win');
  createConfetti();
}

function createConfetti() {
  const colors = ['#4a6cf7', '#ef4444', '#22c55e', '#eab308', '#a855f7'];
  for (let i = 0; i < 50; i++) {
    setTimeout(() => {
      const el = document.createElement('div');
      el.style.cssText = 'position:fixed;width:8px;height:8px;border-radius:2px;' +
        'background:' + colors[Math.floor(Math.random() * colors.length)] + ';' +
        'left:' + (Math.random() * 100) + 'vw;top:-10px;z-index:9999;' +
        'animation:floatUp 2s ease forwards;transform:rotate(' + (Math.random() * 360) + 'deg);';
      document.body.appendChild(el);
      setTimeout(() => el.remove(), 2000);
    }, i * 50);
  }
}

function restartGame() {
  closeModal('winModal');
  initDemoGame();
  addActionLog('New game started!', 'blue');
}
