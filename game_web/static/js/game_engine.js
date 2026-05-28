/* ===== LUDO GAME ENGINE — Bàn cờ 15×15 ===== */
// Canvas 900×900 | Lưới 15×15 | Ô 60×60px
//
// Layout:
//   Chuồng 6×6 ở 4 góc (col/row 0-5 và 9-14)
//   Hình chữ thập: col 6-8 (dọc) + row 6-8 (ngang)
//   Hành lang: col 7 (Blue↑ / Yellow↓) + row 7 (Green← / Red→)
//   Path: col 6, col 8, row 6, row 8 (bao quanh hành lang)
//   Trung tâm: col 6-8, row 6-8

const BOARD_SIZE = 900;
const CELL = 60;
const GRID = 15;

const COLORS = {
  blue:   { main:'#2196F3', light:'#90CAF9', dark:'#1565C0', home:'#BBDEFB', text:'white' },
  red:    { main:'#F44336', light:'#EF9A9A', dark:'#B71C1C', home:'#FFCDD2', text:'white' },
  green:  { main:'#4CAF50', light:'#A5D6A7', dark:'#1B5E20', home:'#C8E6C9', text:'white' },
  yellow: { main:'#FFC107', light:'#FFE082', dark:'#FF6F00', home:'#FFF9C4', text:'#333'  },
};

function cellToPixel(c, r) {
  return { x: c * CELL + CELL / 2, y: r * CELL + CELL / 2 };
}

// ─── PATH 60 Ô ────────────────────────────────────────────────────
// Đi theo chiều kim đồng hồ, bắt đầu từ ô xuất phát Blue.
// Path đi qua 2 hàng/cột bao quanh hành lang (col 6&8, row 6&8)
// và đi qua rìa bàn (col 0, col 14, row 0, row 14) để nối các cạnh.
//
// Sơ đồ path (B=Blue, R=Red, Y=Yellow, G=Green, số=index):
//
//      col: 0  1  2  3  4  5  6  7  8  9 10 11 12 13 14
// row  0:  19 18 17 16 15 -- -- -- R0 R1 R2 R3 R4 R5 R6
// row  1:  20 -- -- -- -- -- -- -- -- -- -- -- -- -- R7
// row  2:  21 -- -- -- -- -- -- -- -- -- -- -- -- -- R8
// row  3:  22 -- -- -- -- -- -- -- -- -- -- -- -- -- R9
// row  4:  23 -- -- -- -- -- -- -- -- -- -- -- -- -- Ra
// row  5:  24 -- -- -- -- -- -- -- -- -- -- -- -- -- Rb
// row  6:  25 26 27 28 29 2a B0 -- Y0 Yb Ya Y9 Y8 Y7 Rc
// row  7:  -- -- -- -- -- -- -- [★] -- -- -- -- -- -- Rd
// row  8:  2f 2e 2d 2c 2b B5 B4 -- Y1 -- -- -- -- -- Re
// row  9:  30 -- -- -- -- -- -- -- -- -- -- -- -- -- Rf
// row 10:  31 -- -- -- -- -- -- -- -- -- -- -- -- -- G0
// row 11:  32 -- -- -- -- -- -- -- -- -- -- -- -- -- G1
// row 12:  33 -- -- -- -- -- -- -- -- -- -- -- -- -- G2
// row 13:  34 -- -- -- -- -- -- -- -- -- -- -- -- -- G3
// row 14:  35 36 37 38 39 3a 3b -- G9 G8 G7 G6 G5 G4 G4
//
// Quá phức tạp để vẽ sơ đồ. Dùng code:

const LUDO_PATH = (() => {
  const p = [];

  // ── BLUE (0-14) ──
  // Xuất phát Blue: (6,8) — ô đầu tiên bên trái hành lang Blue, hàng 8
  // Đi lên col=6: (6,8)→(6,2) = 7 ô
  for (let r = 8; r >= 2; r--) p.push([6, r]);
  // Rẽ trái row=6: (5,6)→(0,6) = 6 ô  [qua khu chuồng Blue]
  for (let c = 5; c >= 0; c--) p.push([c, 6]);
  // Lên col=0: (0,5)→(0,4) = 2 ô
  p.push([0, 5], [0, 4]);
  // Tổng: 7+6+2 = 15 ✓

  // ── RED (15-29) ──
  // Tiếp từ (0,4), lên col=0: (0,3)→(0,0) = 4 ô
  for (let r = 3; r >= 0; r--) p.push([0, r]);
  // Phải row=0: (1,0)→(7,0) = 7 ô
  for (let c = 1; c <= 7; c++) p.push([c, 0]);
  // Xuống col=8: (8,0)→(8,3) = 4 ô
  for (let r = 0; r <= 3; r++) p.push([8, r]);
  // Tổng: 4+7+4 = 15 ✓

  // ── YELLOW (30-44) ──
  // Tiếp từ (8,3), xuống col=8: (8,4)→(8,8) = 5 ô
  for (let r = 4; r <= 8; r++) p.push([8, r]);
  // Phải row=6: (9,6)→(14,6) = 6 ô  [qua khu chuồng Red]
  for (let c = 9; c <= 14; c++) p.push([c, 6]);
  // Xuống col=14: (14,7)→(14,10) = 4 ô
  for (let r = 7; r <= 10; r++) p.push([14, r]);
  // Tổng: 5+6+4 = 15 ✓

  // ── GREEN (45-59) ──
  // Tiếp từ (14,10), xuống col=14: (14,11)→(14,14) = 4 ô
  for (let r = 11; r <= 14; r++) p.push([14, r]);
  // Trái row=14: (13,14)→(9,14) = 5 ô
  for (let c = 13; c >= 9; c--) p.push([c, 14]);
  // Lên col=6: (6,14)→(6,9) = 6 ô
  for (let r = 14; r >= 9; r--) p.push([6, r]);
  // Tổng: 4+5+6 = 15 ✓

  // Tổng toàn bộ: 15×4 = 60 ✓
  return p;
})();

// Verify
(() => {
  const seen = new Set();
  LUDO_PATH.forEach(([c, r], i) => {
    const k = `${c},${r}`;
    if (seen.has(k)) console.error(`TRÙNG idx ${i}: (${c},${r})`);
    seen.add(k);
  });
  if (LUDO_PATH.length !== 60) console.error(`Độ dài path = ${LUDO_PATH.length}`);
})();

function getPathPixel(idx) {
  const cell = LUDO_PATH[((idx % 60) + 60) % 60];
  return cellToPixel(cell[0], cell[1]);
}

// ─── Ô đặc biệt ───────────────────────────────────────────────────
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
const TILE_ICONS  = { lucky:'⭐', unlucky:'💀', stun:'😵', minigame:'🎮' };
const TILE_COLORS = { lucky:'#FFC107', unlucky:'#F44336', stun:'#9C27B0', minigame:'#4CAF50' };

// ─── Vị trí xuất phát ─────────────────────────────────────────────
// Blue  = idx 0  → (6,8)
// Red   = idx 15 → (0,3) — không đúng vị trí xuất phát
// Xuất phát = ô đầu tiên của mỗi segment
const START_POSITIONS = { blue: 0, red: 15, yellow: 30, green: 45 };

// ─── Vị trí chuồng ────────────────────────────────────────────────
const HOME_POSITIONS = {
  blue:   [cellToPixel(1,1), cellToPixel(3,1), cellToPixel(1,3), cellToPixel(3,3)],
  red:    [cellToPixel(11,1),cellToPixel(13,1),cellToPixel(11,3),cellToPixel(13,3)],
  yellow: [cellToPixel(1,11),cellToPixel(3,11),cellToPixel(1,13),cellToPixel(3,13)],
  green:  [cellToPixel(11,11),cellToPixel(13,11),cellToPixel(11,13),cellToPixel(13,13)],
};

// ─── Hành lang về đích (6 ô, số 1→6) ─────────────────────────────
// Ô số 1 = gần đường chính nhất, ô số 6 = gần trung tâm nhất
// cellToPixel(col, row) — tham số đầu là cột, tham số hai là hàng
//
// Blue  : vào từ col=6 row=8, hành lang col=7, đi lên (row 8→3)
// Red   : vào từ col=8 row=0, hành lang row=7, đi xuống (row 1→6) — col=8
// Yellow: vào từ col=8 row=6, hành lang col=7, đi xuống (row 6→11)
// Green : vào từ col=6 row=14, hành lang row=7, đi trái (col 13→8)
const FINISH_LANE_CELLS = {
  blue:   [[7,8],[7,7],[7,6],[7,5],[7,4],[7,3]],
  red:    [[8,1],[8,2],[8,3],[8,4],[8,5],[8,6]],
  yellow: [[7,6],[7,7],[7,8],[7,9],[7,10],[7,11]],
  green:  [[13,7],[12,7],[11,7],[10,7],[9,7],[8,7]],
};
const FINISH_LANES = {};
Object.entries(FINISH_LANE_CELLS).forEach(([color, cells]) => {
  FINISH_LANES[color] = cells.map(([c,r]) => cellToPixel(c,r));
});

// ─── Game State ────────────────────────────────────────────────────
const GameState = {
  players:[], currentTurn:0, diceValue:0,
  diceRolled:false, gameId:null, phase:'waiting', winner:null,
  init(playerData) {
    this.players = playerData.map((p,i) => ({
      ...p,
      pieces:[0,1,2,3].map(id=>({id,pos:-1,status:'home'})),
      finishedCount:0, stunned:false, isActive:i===0,
    }));
    this.phase='playing';
  },
  getCurrentPlayer(){ return this.players[this.currentTurn]; },
  nextTurn(){
    this.currentTurn=(this.currentTurn+1)%this.players.length;
    this.diceRolled=false; this.diceValue=0;
  },
  getAbsolutePosition(color, relPos){
    if(relPos<=0||relPos>60) return null;
    return (START_POSITIONS[color]+relPos-1)%60;
  },
};

// ─── Board Renderer ────────────────────────────────────────────────
const BoardRenderer = {
  canvas:null, ctx:null,
  init(canvasId){
    this.canvas=document.getElementById(canvasId);
    if(!this.canvas) return;
    this.canvas.width=this.canvas.height=BOARD_SIZE;
    this.ctx=this.canvas.getContext('2d');
    this.drawBoard();
  },

  drawBoard(){
    const ctx=this.ctx;
    ctx.fillStyle='#f5f5f5';
    ctx.fillRect(0,0,BOARD_SIZE,BOARD_SIZE);
    this._drawCross(ctx);
    this._drawHomeZone(ctx,0,0,'blue');
    this._drawHomeZone(ctx,9,0,'red');
    this._drawHomeZone(ctx,0,9,'yellow');
    this._drawHomeZone(ctx,9,9,'green');
    this._drawPathCells(ctx);
    this._drawFinishLanes(ctx);
    this._drawCenter(ctx);
    this._drawSpecialIcons(ctx);
    ctx.strokeStyle='#333'; ctx.lineWidth=3;
    ctx.strokeRect(1,1,BOARD_SIZE-2,BOARD_SIZE-2);
  },

  _drawCross(ctx){
    const C=CELL;
    ctx.fillStyle='#e0e0e0';
    ctx.fillRect(6*C,0,3*C,BOARD_SIZE);
    ctx.fillRect(0,6*C,BOARD_SIZE,3*C);
    ctx.strokeStyle='#ccc'; ctx.lineWidth=0.5;
    for(let i=0;i<=GRID;i++){
      ctx.beginPath(); ctx.moveTo(i*C,0); ctx.lineTo(i*C,BOARD_SIZE); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0,i*C); ctx.lineTo(BOARD_SIZE,i*C); ctx.stroke();
    }
  },

  _drawHomeZone(ctx,sc,sr,color){
    const C=CELL, col=COLORS[color];
    const x=sc*C, y=sr*C, size=6*C;
    ctx.fillStyle=col.home; ctx.fillRect(x,y,size,size);
    ctx.strokeStyle=col.dark; ctx.lineWidth=2.5;
    ctx.strokeRect(x+1,y+1,size-2,size-2);
    const cx=x+size/2, cy=y+size/2;
    ctx.strokeStyle=col.main; ctx.lineWidth=3;
    ctx.beginPath(); ctx.arc(cx,cy,size/2-12,0,Math.PI*2); ctx.stroke();
    ctx.fillStyle=col.main+'22';
    ctx.beginPath(); ctx.arc(cx,cy,size/2-12,0,Math.PI*2); ctx.fill();
    [[-1,-1],[1,-1],[-1,1],[1,1]].forEach(([dx,dy])=>{
      const sx=cx+dx*38, sy=cy+dy*38;
      ctx.fillStyle='#fff'; ctx.beginPath(); ctx.arc(sx,sy,18,0,Math.PI*2); ctx.fill();
      ctx.strokeStyle=col.main; ctx.lineWidth=2.5;
      ctx.beginPath(); ctx.arc(sx,sy,18,0,Math.PI*2); ctx.stroke();
      ctx.fillStyle=col.light; ctx.beginPath(); ctx.arc(sx,sy,11,0,Math.PI*2); ctx.fill();
    });
  },

  _drawPathCells(ctx){
    const C=CELL;
    const bgMap={lucky:'#FFF9C4',unlucky:'#FFCDD2',stun:'#E1BEE7',minigame:'#C8E6C9'};
    const startMap={
      [START_POSITIONS.blue]:  COLORS.blue.main,
      [START_POSITIONS.red]:   COLORS.red.main,
      [START_POSITIONS.yellow]:COLORS.yellow.main,
      [START_POSITIONS.green]: COLORS.green.main,
    };
    LUDO_PATH.forEach(([c,r],idx)=>{
      const x=c*C, y=r*C, type=SPECIAL_TILES[idx];
      ctx.fillStyle = startMap[idx] ? startMap[idx]+'55'
                    : bgMap[type]   ? bgMap[type]
                    : '#ffffff';
      ctx.fillRect(x,y,C,C);
      ctx.strokeStyle='#aaa'; ctx.lineWidth=0.8;
      ctx.strokeRect(x,y,C,C);
      if(startMap[idx]){
        ctx.fillStyle=startMap[idx];
        ctx.beginPath(); ctx.arc(x+C/2,y+C/2,8,0,Math.PI*2); ctx.fill();
      }
    });
  },

  _drawFinishLanes(ctx){
    const C=CELL;
    Object.entries(FINISH_LANE_CELLS).forEach(([color,cells])=>{
      const col=COLORS[color];
      cells.forEach(([c,r],i)=>{
        const x=c*C, y=r*C;
        ctx.fillStyle=col.main+(i===5?'ff':Math.round(80+i*35).toString(16).padStart(2,'0'));
        ctx.fillRect(x,y,C,C);
        ctx.strokeStyle=col.dark; ctx.lineWidth=1;
        ctx.strokeRect(x,y,C,C);
        ctx.fillStyle='white';
        ctx.font=`bold ${i===5?17:14}px Arial`;
        ctx.textAlign='center'; ctx.textBaseline='middle';
        ctx.fillText(i+1,x+C/2,y+C/2);
      });
    });
  },

  _drawCenter(ctx){
    const C=CELL;
    const x0=6*C, y0=6*C, size=3*C, cx=x0+size/2, cy=y0+size/2;
    ctx.fillStyle='#fff'; ctx.fillRect(x0,y0,size,size);
    [[COLORS.blue.main,  [cx,cy],[x0,y0],      [x0+size,y0]      ],
     [COLORS.red.main,   [cx,cy],[x0+size,y0],  [x0+size,y0+size] ],
     [COLORS.yellow.main,[cx,cy],[x0+size,y0+size],[x0,y0+size]   ],
     [COLORS.green.main, [cx,cy],[x0,y0+size],  [x0,y0]           ],
    ].forEach(([color,...pts])=>{
      ctx.fillStyle=color+'cc';
      ctx.beginPath();
      ctx.moveTo(pts[0][0],pts[0][1]);
      ctx.lineTo(pts[1][0],pts[1][1]);
      ctx.lineTo(pts[2][0],pts[2][1]);
      ctx.closePath(); ctx.fill();
    });
    ctx.save(); ctx.translate(cx,cy);
    ctx.fillStyle='rgba(255,255,255,0.95)';
    this._star(ctx,0,0,5,size*0.28,size*0.12);
    ctx.restore();
    ctx.strokeStyle='#bbb'; ctx.lineWidth=1.5;
    ctx.strokeRect(x0,y0,size,size);
  },

  _star(ctx,cx,cy,n,R,r){
    let a=-(Math.PI/2), s=Math.PI/n;
    ctx.beginPath(); ctx.moveTo(cx+R*Math.cos(a),cy+R*Math.sin(a));
    for(let i=0;i<n;i++){
      a+=s; ctx.lineTo(cx+r*Math.cos(a),cy+r*Math.sin(a));
      a+=s; ctx.lineTo(cx+R*Math.cos(a),cy+R*Math.sin(a));
    }
    ctx.closePath(); ctx.fill();
  },

  _drawSpecialIcons(ctx){
    const C=CELL;
    LUDO_PATH.forEach(([c,r],idx)=>{
      const type=SPECIAL_TILES[idx];
      if(!type) return;
      ctx.font='16px Arial'; ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.fillText(TILE_ICONS[type],c*C+C/2,r*C+C/2);
    });
  },

  getGridPos(idx){ return getPathPixel(idx); },
};

// ─── Piece Renderer ────────────────────────────────────────────────
const PieceRenderer = {
  layer:null,
  init(layerId){
    this.layer=document.getElementById(layerId);
    if(this.layer){ this.layer.style.width=BOARD_SIZE+'px'; this.layer.style.height=BOARD_SIZE+'px'; }
  },
  renderAll(players){
    if(!this.layer) return;
    this.layer.innerHTML='';
    players.forEach(player=>{
      player.pieces.forEach((piece,idx)=>{
        const pos=this._pos(player.color,piece,idx);
        if(!pos) return;
        const el=document.createElement('div');
        el.id=`piece-${player.color}-${piece.id}`;
        el.dataset.color=player.color; el.dataset.pieceId=piece.id;
        el.style.cssText=`position:absolute;left:${pos.x-15}px;top:${pos.y-15}px;width:30px;height:30px;display:flex;align-items:center;justify-content:center;font-size:22px;cursor:pointer;z-index:10;transition:left .35s ease,top .35s ease;filter:drop-shadow(0 2px 4px rgba(0,0,0,.5));`;
        el.textContent='🐴';
        this.layer.appendChild(el);
      });
    });
  },
  _pos(color,piece,idx){
    if(piece.status==='home'||piece.pos<=0) return HOME_POSITIONS[color]?.[idx]||null;
    if(piece.status==='finished'||piece.pos>60){
      const cx=BOARD_SIZE/2, cy=BOARD_SIZE/2;
      return {x:cx+(idx%2)*20-10,y:cy+Math.floor(idx/2)*20-10};
    }
    const abs=GameState.getAbsolutePosition(color,piece.pos);
    return abs===null?null:getPathPixel(abs);
  },
  animateMove(el,toPos,cb){
    if(!el){if(cb)cb();return;}
    el.style.left=(toPos.x-15)+'px'; el.style.top=(toPos.y-15)+'px';
    setTimeout(()=>{if(cb)cb();},380);
  },
  showFloatText(x,y,text,color='#FFC107'){
    const layer=document.getElementById('effectsLayer'); if(!layer) return;
    const el=document.createElement('div');
    el.className='float-text';
    el.style.cssText=`position:absolute;left:${x}px;top:${y-20}px;color:${color};font-size:13px;font-weight:700;pointer-events:none;animation:floatUp 1.5s ease forwards;`;
    el.textContent=text; layer.appendChild(el);
    setTimeout(()=>el.remove(),1500);
  },
  showCaptureEffect(x,y){ this.showFloatText(x,y,'💥 Ăn quân!','#F44336'); },
};

// ─── Export ────────────────────────────────────────────────────────
window.GameEngine = {
  GameState, BoardRenderer, PieceRenderer,
  BOARD_SIZE, CELL, GRID, COLORS,
  LUDO_PATH, START_POSITIONS, HOME_POSITIONS,
  FINISH_LANES, FINISH_LANE_CELLS,
  SPECIAL_TILES, TILE_ICONS, TILE_COLORS,
  getPathPixel, cellToPixel,
};
