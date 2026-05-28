/* ===== MINI-GAMES MANAGER ===== */

const MiniGameManager = {
  currentGame: null,
  
  startRandom() {
    const types = ['math_quiz', 'word_hunt', 'animal_race', 'block_blast'];
    const type = types[Math.floor(Math.random() * types.length)];
    this.start(type);
  },
  
  start(type) {
    this.currentGame = type;
    const modal = document.getElementById('minigameModal');
    const content = document.getElementById('minigameContent');
    if (!modal || !content) return;
    
    const games = {
      math_quiz: MathQuiz,
      word_hunt: WordHunt,
      animal_race: AnimalRace,
      block_blast: BlockBlast
    };
    
    const game = games[type];
    if (game) {
      content.innerHTML = game.render();
      game.init();
    }
    
    modal.classList.add('active');
  },
  
  finish(result, reward) {
    const modal = document.getElementById('minigameModal');
    if (modal) modal.classList.remove('active');
    
    if (result === 'win') {
      showToast(`Mini-game thắng! +${reward} bước 🎉`, 'success');
      AudioManager.playWin();
      // Apply reward to current player
      const player = GameState.getCurrentPlayer();
      const activePiece = player.pieces.find(p => p.status === 'active');
      if (activePiece) {
        activePiece.pos = Math.min(activePiece.pos + reward, 51);
        PieceRenderer.renderAll(GameState.players);
      }
    } else {
      showToast('Mini-game thua! Mất lượt 😢', 'error');
    }
    
    setTimeout(() => endTurn(), 500);
  }
};

// ===== MATH QUIZ MINI-GAME =====
const MathQuiz = {
  answer: 0,
  timer: null,
  timeLeft: 10,
  
  render() {
    return `
      <div style="text-align:center; padding:8px;">
        <div style="font-size:11px; letter-spacing:2px; color:#8b8fa8; margin-bottom:8px;">MINI-GAME EVENT</div>
        <h2 style="font-family:'Orbitron',sans-serif; font-size:28px; font-weight:900; margin-bottom:16px;">LÀM TOÁN NHANH</h2>
        <div style="margin-bottom:12px;">
          <div style="font-size:11px; color:#8b8fa8; margin-bottom:4px;">TIME REMAINING</div>
          <div style="background:#2a2a40; border-radius:4px; height:6px; overflow:hidden;">
            <div id="mathTimerBar" style="height:100%; background:#ef4444; width:100%; transition:width 1s linear;"></div>
          </div>
          <div id="mathTimer" style="font-size:18px; font-weight:700; color:#ef4444; margin-top:4px;">10:00</div>
        </div>
        <div id="mathQuestion" style="font-size:40px; font-weight:900; margin:20px 0; letter-spacing:4px;"></div>
        <div id="mathOptions" style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-top:16px;"></div>
        <button onclick="MiniGameManager.finish('lose', 0)" style="margin-top:12px; background:none; border:none; color:#8b8fa8; cursor:pointer; font-size:13px;">✕ GIVE UP</button>
      </div>
    `;
  },
  
  init() {
    this.generateQuestion();
    this.startTimer();
  },
  
  generateQuestion() {
    const ops = ['+', '-', '×'];
    const op = ops[Math.floor(Math.random() * ops.length)];
    let a, b;
    
    if (op === '+') { a = Math.floor(Math.random() * 200) + 50; b = Math.floor(Math.random() * 200) + 50; this.answer = a + b; }
    else if (op === '-') { a = Math.floor(Math.random() * 200) + 100; b = Math.floor(Math.random() * 100) + 10; this.answer = a - b; }
    else { a = Math.floor(Math.random() * 20) + 5; b = Math.floor(Math.random() * 20) + 5; this.answer = a * b; }
    
    const qEl = document.getElementById('mathQuestion');
    if (qEl) qEl.textContent = `${a} ${op} ${b} = ?`;
    
    // Generate options
    const options = [this.answer];
    while (options.length < 4) {
      const wrong = this.answer + (Math.floor(Math.random() * 20) - 10);
      if (!options.includes(wrong) && wrong > 0) options.push(wrong);
    }
    options.sort(() => Math.random() - 0.5);
    
    const optEl = document.getElementById('mathOptions');
    if (optEl) {
      optEl.innerHTML = options.map(opt => `
        <button onclick="MathQuiz.checkAnswer(${opt})" style="
          padding:16px; background:#1a1a2e; border:1px solid #2a2a40; border-radius:12px;
          color:white; font-size:20px; font-weight:700; cursor:pointer; font-family:Inter,sans-serif;
          transition:all 0.2s;" onmouseover="this.style.background='#4a6cf7'" onmouseout="this.style.background='#1a1a2e'">
          ${opt}
        </button>
      `).join('');
    }
  },
  
  checkAnswer(val) {
    clearInterval(this.timer);
    if (val === this.answer) {
      AudioManager.playWin();
      MiniGameManager.finish('win', 3);
    } else {
      AudioManager.playError();
      MiniGameManager.finish('lose', 0);
    }
  },
  
  startTimer() {
    this.timeLeft = 10;
    this.timer = setInterval(() => {
      this.timeLeft--;
      const bar = document.getElementById('mathTimerBar');
      const timerEl = document.getElementById('mathTimer');
      if (bar) bar.style.width = (this.timeLeft * 10) + '%';
      if (timerEl) timerEl.textContent = `0${this.timeLeft}:00`;
      if (this.timeLeft <= 0) {
        clearInterval(this.timer);
        MiniGameManager.finish('lose', 0);
      }
    }, 1000);
  }
};

// ===== WORD HUNT MINI-GAME =====
const WordHunt = {
  words: [
    { word: 'CÁ NGỰA', hint: '🐴 Con vật trong game này', image: '🐴' },
    { word: 'XÚC XẮC', hint: '🎲 Dùng để tung số', image: '🎲' },
    { word: 'CHIẾN THẮNG', hint: '🏆 Kết quả tốt nhất', image: '🏆' },
    { word: 'BÀN CỜ', hint: '♟️ Nơi diễn ra trận đấu', image: '♟️' },
    { word: 'ĂN QUÂN', hint: '💥 Hành động đánh bại đối thủ', image: '💥' }
  ],
  current: null,
  guessed: [],
  timer: null,
  
  render() {
    return `
      <div style="padding:8px;">
        <div style="text-align:center; margin-bottom:16px;">
          <div style="font-size:11px; letter-spacing:2px; color:#8b8fa8;">MINI-GAME</div>
          <h2 style="font-family:'Orbitron',sans-serif; font-size:22px; font-weight:900;">ĐUỔI HÌNH BẮT CHỮ</h2>
        </div>
        <div style="display:flex; gap:16px;">
          <div style="flex:1;">
            <div id="wordImage" style="background:#0d0d14; border-radius:12px; height:160px; display:flex; align-items:center; justify-content:center; font-size:80px; margin-bottom:12px; border:1px solid #2a2a40;"></div>
            <div style="background:#2a2a40; border-radius:4px; height:4px; overflow:hidden; margin-bottom:8px;">
              <div id="wordTimerBar" style="height:100%; background:#ef4444; width:100%; transition:width 1s linear;"></div>
            </div>
            <div id="wordGuessed" style="display:flex; gap:6px; justify-content:center; margin-bottom:12px; flex-wrap:wrap;"></div>
          </div>
        </div>
        <div id="wordKeyboard" style="display:flex; flex-direction:column; gap:6px;"></div>
        <div style="display:flex; justify-content:space-between; margin-top:12px;">
          <button onclick="WordHunt.hint()" style="background:none; border:none; color:#8b8fa8; cursor:pointer; font-size:13px;">💡 Gợi ý (-50 điểm)</button>
          <button onclick="MiniGameManager.finish('lose', 0)" style="background:#ef4444; border:none; border-radius:8px; color:white; padding:8px 16px; cursor:pointer; font-size:13px; font-family:Inter,sans-serif;">Chuyển câu →</button>
        </div>
      </div>
    `;
  },
  
  init() {
    this.current = this.words[Math.floor(Math.random() * this.words.length)];
    this.guessed = [];
    
    const imgEl = document.getElementById('wordImage');
    if (imgEl) imgEl.textContent = this.current.image;
    
    this.renderGuessed();
    this.renderKeyboard();
    this.startTimer();
  },
  
  renderGuessed() {
    const el = document.getElementById('wordGuessed');
    if (!el) return;
    
    el.innerHTML = this.current.word.split('').map((ch, i) => {
      if (ch === ' ') return '<div style="width:12px;"></div>';
      const revealed = this.guessed.includes(ch);
      return `
        <div style="width:32px; height:36px; background:${revealed ? '#4a6cf7' : '#1a1a2e'}; border:1px solid ${revealed ? '#4a6cf7' : '#2a2a40'}; border-radius:6px; display:flex; align-items:center; justify-content:center; font-size:14px; font-weight:700; transition:all 0.2s;">
          ${revealed ? ch : ''}
        </div>
      `;
    }).join('');
  },
  
  renderKeyboard() {
    const rows = [
      ['Q','W','E','R','T','Y','U','I','O','P'],
      ['A','S','D','F','G','H','J','K','L','⌫'],
      ['Z','X','C','V','B','N','M']
    ];
    
    const el = document.getElementById('wordKeyboard');
    if (!el) return;
    
    el.innerHTML = rows.map(row => `
      <div style="display:flex; gap:4px; justify-content:center;">
        ${row.map(key => `
          <button onclick="WordHunt.guess('${key}')" id="key-${key}" style="
            width:${key === '⌫' ? '44px' : '34px'}; height:36px; background:#1a1a2e; border:1px solid #2a2a40;
            border-radius:6px; color:white; font-size:12px; font-weight:700; cursor:pointer;
            font-family:Inter,sans-serif; transition:all 0.2s;"
            onmouseover="this.style.background='#4a6cf7'" onmouseout="if(!this.disabled) this.style.background='#1a1a2e'">
            ${key}
          </button>
        `).join('')}
      </div>
    `).join('');
  },
  
  guess(letter) {
    if (letter === '⌫') return;
    if (this.guessed.includes(letter)) return;
    
    this.guessed.push(letter);
    AudioManager.playClick();
    
    const keyEl = document.getElementById(`key-${letter}`);
    if (keyEl) {
      keyEl.disabled = true;
      keyEl.style.background = this.current.word.includes(letter) ? '#16a34a' : '#dc2626';
      keyEl.style.opacity = '0.6';
    }
    
    this.renderGuessed();
    
    // Check win
    const allGuessed = this.current.word.split('').filter(c => c !== ' ').every(c => this.guessed.includes(c));
    if (allGuessed) {
      clearInterval(this.timer);
      AudioManager.playWin();
      MiniGameManager.finish('win', 4);
    }
  },
  
  hint() {
    const unguessed = this.current.word.split('').filter(c => c !== ' ' && !this.guessed.includes(c));
    if (unguessed.length > 0) {
      this.guess(unguessed[0]);
    }
  },
  
  startTimer() {
    let timeLeft = 45;
    this.timer = setInterval(() => {
      timeLeft--;
      const bar = document.getElementById('wordTimerBar');
      if (bar) bar.style.width = (timeLeft / 45 * 100) + '%';
      if (timeLeft <= 0) {
        clearInterval(this.timer);
        MiniGameManager.finish('lose', 0);
      }
    }, 1000);
  }
};

// ===== ANIMAL RACE MINI-GAME =====
const AnimalRace = {
  animals: [
    { name: 'GÀ CHIẾN', emoji: '🐔', speed: 0, pos: 0 },
    { name: 'VỊT SẤM SÉT', emoji: '🦆', speed: 0, pos: 0 },
    { name: 'LỢN TANKER', emoji: '🐷', speed: 0, pos: 0 },
    { name: 'MÈO TỐC ĐỘ', emoji: '🐱', speed: 0, pos: 0 }
  ],
  chosen: null,
  raceInterval: null,
  
  render() {
    return `
      <div style="padding:8px;">
        <div style="text-align:center; margin-bottom:16px;">
          <div style="font-size:11px; letter-spacing:2px; color:#8b8fa8;">MINI-GAME</div>
          <h2 style="font-family:'Orbitron',sans-serif; font-size:22px; font-weight:900;">ĐUA THÚ 🏁</h2>
          <p style="color:#8b8fa8; font-size:13px;">Chọn con thú của bạn!</p>
        </div>
        <div id="raceTrack" style="background:#1a1a2e; border-radius:12px; padding:16px; margin-bottom:16px; border:1px solid #2a2a40;">
          ${this.animals.map((a, i) => `
            <div style="margin-bottom:10px;">
              <div style="display:flex; align-items:center; gap:8px; margin-bottom:4px;">
                <span style="font-size:20px;">${a.emoji}</span>
                <span style="font-size:12px; font-weight:700;">${a.name}</span>
              </div>
              <div style="background:#0d0d14; border-radius:4px; height:20px; position:relative; overflow:hidden;">
                <div id="animal-${i}" style="height:100%; background:linear-gradient(90deg, #4a6cf7, #6c8fff); width:0%; transition:width 0.3s ease; border-radius:4px; display:flex; align-items:center; justify-content:flex-end; padding-right:4px; font-size:12px;">
                  ${a.emoji}
                </div>
              </div>
            </div>
          `).join('')}
        </div>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px;" id="animalChoices">
          ${this.animals.map((a, i) => `
            <button onclick="AnimalRace.choose(${i})" style="
              padding:12px; background:#1a1a2e; border:1px solid #2a2a40; border-radius:10px;
              color:white; cursor:pointer; font-family:Inter,sans-serif; transition:all 0.2s;
              display:flex; align-items:center; gap:8px; font-size:13px; font-weight:600;"
              onmouseover="this.style.borderColor='#4a6cf7'" onmouseout="this.style.borderColor='#2a2a40'">
              <span style="font-size:24px;">${a.emoji}</span> ${a.name}
            </button>
          `).join('')}
        </div>
        <div id="raceResult" style="display:none; text-align:center; margin-top:16px;"></div>
      </div>
    `;
  },
  
  init() {
    this.animals.forEach(a => { a.pos = 0; a.speed = Math.random() * 2 + 0.5; });
  },
  
  choose(idx) {
    this.chosen = idx;
    const choices = document.getElementById('animalChoices');
    if (choices) choices.style.display = 'none';
    
    showToast(`Bạn chọn ${this.animals[idx].name}!`, 'info');
    this.startRace();
  },
  
  startRace() {
    this.raceInterval = setInterval(() => {
      let finished = null;
      
      this.animals.forEach((a, i) => {
        const boost = Math.random() * 3;
        a.pos = Math.min(a.pos + a.speed + boost, 100);
        
        const bar = document.getElementById(`animal-${i}`);
        if (bar) bar.style.width = a.pos + '%';
        
        if (a.pos >= 100 && !finished) {
          finished = i;
        }
      });
      
      if (finished !== null) {
        clearInterval(this.raceInterval);
        this.showResult(finished);
      }
    }, 200);
  },
  
  showResult(winner) {
    const resultEl = document.getElementById('raceResult');
    if (!resultEl) return;
    
    const won = winner === this.chosen;
    resultEl.style.display = 'block';
    resultEl.innerHTML = `
      <div style="font-size:32px; margin-bottom:8px;">${won ? '🏆' : '😢'}</div>
      <div style="font-size:18px; font-weight:700; color:${won ? '#4ade80' : '#ff4d6d'};">
        ${won ? 'THẮNG! +5 bước' : `${this.animals[winner].name} về nhất!`}
      </div>
    `;
    
    setTimeout(() => MiniGameManager.finish(won ? 'win' : 'lose', 5), 2000);
  }
};

// ===== BLOCK BLAST MINI-GAME =====
const BlockBlast = {
  grid: [],
  score: 0,
  
  render() {
    return `
      <div style="padding:8px; text-align:center;">
        <div style="font-size:11px; letter-spacing:2px; color:#8b8fa8; margin-bottom:4px;">MINI-GAME</div>
        <h2 style="font-family:'Orbitron',sans-serif; font-size:22px; font-weight:900; margin-bottom:8px;">BLOCK BLAST 🧱</h2>
        <p style="color:#8b8fa8; font-size:12px; margin-bottom:12px;">Click vào các ô cùng màu để xóa! Xóa 3+ hàng để thắng.</p>
        <div id="blockGrid" style="display:inline-grid; grid-template-columns:repeat(7,36px); gap:3px; margin-bottom:12px;"></div>
        <div style="font-size:14px; color:#8b8fa8;">Điểm: <span id="blockScore" style="color:white; font-weight:700;">0</span></div>
        <div style="margin-top:12px; display:flex; gap:8px; justify-content:center;">
          <button onclick="BlockBlast.checkWin()" style="background:#4a6cf7; border:none; border-radius:8px; color:white; padding:10px 20px; cursor:pointer; font-family:Inter,sans-serif; font-weight:600;">Kiểm tra</button>
          <button onclick="MiniGameManager.finish('lose', 0)" style="background:#2a2a40; border:none; border-radius:8px; color:#8b8fa8; padding:10px 20px; cursor:pointer; font-family:Inter,sans-serif;">Bỏ qua</button>
        </div>
      </div>
    `;
  },
  
  init() {
    this.score = 0;
    this.grid = [];
    const colors = ['#4a6cf7', '#ef4444', '#22c55e', '#eab308', '#a855f7'];
    
    for (let r = 0; r < 6; r++) {
      this.grid.push([]);
      for (let c = 0; c < 7; c++) {
        this.grid[r].push(colors[Math.floor(Math.random() * colors.length)]);
      }
    }
    
    this.renderGrid();
  },
  
  renderGrid() {
    const el = document.getElementById('blockGrid');
    if (!el) return;
    
    el.innerHTML = '';
    this.grid.forEach((row, r) => {
      row.forEach((color, c) => {
        const cell = document.createElement('div');
        cell.style.cssText = `
          width:36px; height:36px; border-radius:6px; cursor:pointer;
          background:${color || '#1a1a2e'}; border:1px solid ${color ? color + '88' : '#2a2a40'};
          transition:all 0.2s; ${!color ? 'opacity:0.2;' : ''}
        `;
        if (color) {
          cell.onmouseover = () => cell.style.transform = 'scale(1.1)';
          cell.onmouseout = () => cell.style.transform = 'scale(1)';
          cell.onclick = () => this.clickCell(r, c);
        }
        el.appendChild(cell);
      });
    });
  },
  
  clickCell(r, c) {
    const color = this.grid[r][c];
    if (!color) return;
    
    // Find connected cells of same color
    const connected = this.findConnected(r, c, color);
    if (connected.length < 2) return;
    
    // Remove them
    connected.forEach(([cr, cc]) => this.grid[cr][cc] = null);
    this.score += connected.length * 10;
    
    const scoreEl = document.getElementById('blockScore');
    if (scoreEl) scoreEl.textContent = this.score;
    
    AudioManager.playClick();
    this.renderGrid();
  },
  
  findConnected(r, c, color, visited = new Set()) {
    const key = `${r},${c}`;
    if (visited.has(key)) return [];
    if (r < 0 || r >= 6 || c < 0 || c >= 7) return [];
    if (this.grid[r][c] !== color) return [];
    
    visited.add(key);
    const result = [[r, c]];
    
    [[-1,0],[1,0],[0,-1],[0,1]].forEach(([dr, dc]) => {
      result.push(...this.findConnected(r+dr, c+dc, color, visited));
    });
    
    return result;
  },
  
  checkWin() {
    const emptyRows = this.grid.filter(row => row.every(c => !c)).length;
    if (emptyRows >= 2 || this.score >= 100) {
      MiniGameManager.finish('win', 3);
    } else {
      showToast('Cần xóa thêm! Hãy tiếp tục.', 'info');
    }
  }
};

