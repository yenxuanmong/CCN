/**
 * Ludo Master Elite – Game Board Logic (Hoàn chỉnh)
 * Bàn cờ cá ngựa 15×15 với đầy đủ luật chơi
 */

// ── CẤU HÌNH ──────────────────────────────────────────────────────────────
const CELL = 60;
const BOARD = 15;

const PC = {
  0: { name:'Xanh Dương', hex:'#3b82f6', light:'#93c5fd', home:'#0f2040', label:'XANH' },
  1: { name:'Đỏ',         hex:'#ef4444', light:'#fca5a5', home:'#3f0f0f', label:'ĐỎ'   },
  2: { name:'Xanh Lá',    hex:'#22c55e', light:'#86efac', home:'#0f3f1f', label:'LÁ'   },
  3: { name:'Vàng',       hex:'#eab308', light:'#fde047', home:'#3f3000', label:'VÀNG' },
};

// 52 ô đường chính (row, col) theo chiều kim đồng hồ
const PATH = [
  [6,1],[6,2],[6,3],[6,4],[6,5],          // 0-4   Xanh dương xuất phát = 0
  [5,6],[4,6],[3,6],[2,6],[1,6],[0,6],    // 5-10
  [0,7],[0,8],                             // 11-12
  [1,8],[2,8],[3,8],[4,8],[5,8],          // 13-17  Đỏ xuất phát = 13
  [6,9],[6,10],[6,11],[6,12],[6,13],[6,14],// 18-23
  [7,14],[8,14],                           // 24-25
  [8,13],[8,12],[8,11],[8,10],[8,9],      // 26-30  Xanh lá xuất phát = 26
  [9,8],[10,8],[11,8],[12,8],[13,8],[14,8],// 31-36
  [14,7],[14,6],                           // 37-38
  [13,6],[12,6],[11,6],[10,6],[9,6],      // 39-43  Vàng xuất phát = 39
  [8,5],[8,4],[8,3],[8,2],[8,1],[8,0],    // 44-49
  [7,0],[6,0],                             // 50-51
];

// Vị trí xuất phát trên PATH
const START = { 0:0, 1:13, 2:26, 3:39 };

// Đường về đích (6 ô, từ ngoài vào trung tâm)
const HOME_PATH = {
  0: [[7,1],[7,2],[7,3],[7,4],[7,5],[7,6]],
  1: [[1,7],[2,7],[3,7],[4,7],[5,7],[6,7]],
  2: [[7,13],[7,12],[7,11],[7,10],[7,9],[7,8]],
  3: [[13,7],[12,7],[11,7],[10,7],[9,7],[8,7]],
};

// Chuồng ngựa (4 ô trong góc)
const STABLE = {
  0: [[1,1],[1,3],[3,1],[3,3]],
  1: [[1,10],[1,12],[3,10],[3,12]],
  2: [[10,1],[10,3],[12,1],[12,3]],
  3: [[10,10],[10,12],[12,10],[12,12]],
};

// Ô đặc biệt (index trên PATH)
const SPECIAL = {
  3:'LUCKY', 8:'MINIGAME', 16:'UNLUCKY', 21:'STUN',
  29:'LUCKY', 34:'MINIGAME', 42:'UNLUCKY', 47:'STUN',
};
const SPEC_CFG = {
  LUCKY:    { icon:'⭐', color:'#f59e0b', label:'+3 bước' },
  UNLUCKY:  { icon:'💀', color:'#6b7280', label:'-2 bước' },
  STUN:     { icon:'💫', color:'#8b5cf6', label:'Mất lượt' },
  MINIGAME: { icon:'🎮', color:'#06b6d4', label:'Mini-game' },
};

// ── CLASS BÀN CỜ ──────────────────────────────────────────────────────────
class LudoBoard {
  constructor(canvasId, playerIndex) {
    this.canvas = document.getElementById(canvasId);
    this.ctx    = this.canvas.getContext('2d');
    this.pi     = playerIndex;   // chỉ số người chơi hiện tại (0-3)

    this.state       = null;
    this.diceValue   = null;
    this.diceRolled  = false;
    this.animFrame   = null;
    this.glowPhase   = 0;

    this.canvas.width  = BOARD * CELL;
    this.canvas.height = BOARD * CELL;
    this.canvas.addEventListener('click', e => this._onClick(e));

    this._loop();
  }

  setState(s) { this.state = s; this.diceValue = s?.dice ?? null; }

  // ── VÒNG LẶP ANIMATION ──
  _loop() {
    this.glowPhase = (this.glowPhase + 0.05) % (Math.PI * 2);
    this._draw();
    this.animFrame = requestAnimationFrame(() => this._loop());
  }

  // ── VẼ TOÀN BỘ ──
  _draw() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Nền
    ctx.fillStyle = '#080c18';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    this._drawGrid();
    this._drawHomeZones();
    this._drawPath();
    this._drawSpecial();
    this._drawHomePaths();
    this._drawCenter();
    if (this.state) this._drawHorses();
  }

  _cell(r, c, fill, stroke, alpha = 1) {
    const ctx = this.ctx;
    const x = c * CELL + 1, y = r * CELL + 1, s = CELL - 2;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = fill;
    ctx.beginPath(); ctx.roundRect(x, y, s, s, 4); ctx.fill();
    if (stroke) {
      ctx.strokeStyle = stroke; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.roundRect(x, y, s, s, 4); ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  _drawGrid() {
    const ctx = this.ctx;
    ctx.strokeStyle = 'rgba(255,255,255,0.04)'; ctx.lineWidth = .5;
    for (let i = 0; i <= BOARD; i++) {
      ctx.beginPath(); ctx.moveTo(i*CELL,0); ctx.lineTo(i*CELL,BOARD*CELL); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0,i*CELL); ctx.lineTo(BOARD*CELL,i*CELL); ctx.stroke();
    }
  }

  _drawHomeZones() {
    const zones = [
      [0,0,PC[0]], [0,9,PC[1]], [9,0,PC[2]], [9,9,PC[3]]
    ];
    zones.forEach(([sr,sc,c],pi) => {
      const ctx = this.ctx;
      // Nền
      ctx.fillStyle = c.home;
      ctx.fillRect(sc*CELL, sr*CELL, 6*CELL, 6*CELL);
      ctx.strokeStyle = c.hex; ctx.lineWidth = 2;
      ctx.strokeRect(sc*CELL+1, sr*CELL+1, 6*CELL-2, 6*CELL-2);
      // Label
      ctx.fillStyle = c.hex; ctx.font = 'bold 10px Inter';
      ctx.textAlign = 'center';
      ctx.fillText(c.label, (sc+3)*CELL, sr*CELL+14);
      // 4 ô chuồng
      STABLE[pi].forEach(([r,c2]) => {
        const cx = c2*CELL+CELL/2, cy = r*CELL+CELL/2;
        ctx.beginPath(); ctx.arc(cx,cy,CELL/2-4,0,Math.PI*2);
        ctx.fillStyle = c.hex+'25'; ctx.fill();
        ctx.strokeStyle = c.hex; ctx.lineWidth = 2; ctx.stroke();
      });
    });
  }

  _drawPath() {
    PATH.forEach(([r,c],i) => {
      let bg = '#141c2e', border = 'rgba(255,255,255,0.08)';
      // Ô xuất phát
      Object.entries(START).forEach(([pi,si]) => {
        if (i === si) { bg = PC[pi].hex+'35'; border = PC[pi].hex; }
      });
      this._cell(r, c, bg, border);
      // Số nhỏ
      const ctx = this.ctx;
      ctx.fillStyle = 'rgba(255,255,255,0.18)';
      ctx.font = '8px Inter'; ctx.textAlign = 'center';
      ctx.fillText(i+1, c*CELL+CELL/2, r*CELL+CELL-3);
    });
  }

  _drawSpecial() {
    Object.entries(SPECIAL).forEach(([idx,type]) => {
      const [r,c] = PATH[+idx];
      const s = SPEC_CFG[type];
      this._cell(r, c, s.color+'28', s.color);
      const ctx = this.ctx;
      ctx.font = '16px serif'; ctx.textAlign = 'center';
      ctx.fillText(s.icon, c*CELL+CELL/2, r*CELL+CELL/2+5);
    });
  }

  _drawHomePaths() {
    Object.entries(HOME_PATH).forEach(([pi,cells]) => {
      cells.forEach(([r,c],step) => {
        const alpha = 0.25 + step*0.12;
        this._cell(r, c, PC[pi].hex, PC[pi].hex, alpha);
        // Số 1-6
        const ctx = this.ctx;
        ctx.globalAlpha = 0.6;
        ctx.fillStyle = '#fff'; ctx.font = 'bold 10px Inter'; ctx.textAlign = 'center';
        ctx.fillText(step+1, c*CELL+CELL/2, r*CELL+CELL/2+4);
        ctx.globalAlpha = 1;
      });
    });
  }

  _drawCenter() {
    const ctx = this.ctx;
    // Nền trung tâm 3×3
    ctx.fillStyle = '#0d1220';
    ctx.fillRect(6*CELL, 6*CELL, 3*CELL, 3*CELL);
    // Ngôi sao phát sáng
    const glow = 0.6 + 0.4*Math.sin(this.glowPhase);
    ctx.shadowColor = '#f59e0b'; ctx.shadowBlur = 20*glow;
    ctx.font = 'bold 40px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = `rgba(245,158,11,${glow})`;
    ctx.fillText('★', 7.5*CELL, 7.5*CELL);
    ctx.shadowBlur = 0; ctx.textBaseline = 'alphabetic';
  }

  _drawHorses() {
    if (!this.state?.players) return;
    const glow = 0.5 + 0.5*Math.sin(this.glowPhase*2);

    this.state.players.forEach((player, pi) => {
      const c = PC[pi];
      player.positions.forEach((pos, hi) => {
        if (pos < 0) return; // đã về đích
        let r, col;
        if (pos === 0) {
          [r, col] = STABLE[pi][hi];
        } else if (pos <= 6) {
          // Đang trên đường về đích
          [r, col] = HOME_PATH[pi][pos - 1];
        } else {
          const pathIdx = (START[pi] + pos - 7) % 52;
          [r, col] = PATH[pathIdx];
        }
        const canClick = pi === this.pi && this.diceRolled;
        this._drawHorse(r, col, c, hi, canClick, glow);
      });
    });
  }

  _drawHorse(row, col, color, idx, clickable, glow) {
    const ctx = this.ctx;
    const cx = col*CELL+CELL/2, cy = row*CELL+CELL/2;
    const rad = CELL/2 - 5;

    if (clickable) {
      ctx.shadowColor = color.hex;
      ctx.shadowBlur  = 14 * glow;
    }
    // Vòng ngoài
    ctx.beginPath(); ctx.arc(cx, cy, rad+2, 0, Math.PI*2);
    ctx.fillStyle = '#fff'; ctx.fill();
    // Thân
    ctx.beginPath(); ctx.arc(cx, cy, rad, 0, Math.PI*2);
    ctx.fillStyle = color.hex; ctx.fill();
    // Số
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#fff'; ctx.font = 'bold 12px Inter';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(idx+1, cx, cy);
    ctx.textBaseline = 'alphabetic';
  }

  _onClick(e) {
    if (!this.state || !this.diceRolled) return;
    const rect = this.canvas.getBoundingClientRect();
    const sx = this.canvas.width / rect.width;
    const sy = this.canvas.height / rect.height;
    const mx = (e.clientX - rect.left)*sx;
    const my = (e.clientY - rect.top)*sy;
    const col = Math.floor(mx/CELL), row = Math.floor(my/CELL);

    const player = this.state.players[this.pi];
    if (!player) return;

    player.positions.forEach((pos, hi) => {
      if (pos < 0) return;
      let r, c;
      if (pos === 0) { [r,c] = STABLE[this.pi][hi]; }
      else if (pos <= 6) { [r,c] = HOME_PATH[this.pi][pos-1]; }
      else { const pi2 = (START[this.pi]+pos-7)%52; [r,c] = PATH[pi2]; }
      if (r === row && c === col) this.onMove?.(hi, pos);
    });
  }
}
