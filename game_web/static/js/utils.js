/* ===== UTILITY FUNCTIONS ===== */

// Toast notifications
function showToast(message, type = 'info', duration = 3000) {
  const container = document.getElementById('toastContainer');
  if (!container) return;
  
  const icons = { success: '✅', error: '❌', info: 'ℹ️', warning: '⚠️' };
  const colors = { success: '#4ade80', error: '#ff4d6d', info: '#6c8fff', warning: '#fbbf24' };
  
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.style.cssText = `
    background: #1a1a2e; border: 1px solid #2a2a40; border-radius: 12px;
    padding: 12px 16px; min-width: 260px; display: flex; align-items: center;
    gap: 10px; box-shadow: 0 4px 20px rgba(0,0,0,0.4);
    border-left: 3px solid ${colors[type]};
    font-family: Inter, sans-serif; font-size: 14px; color: white;
    animation: slideIn 0.3s ease;
  `;
  toast.innerHTML = `<span>${icons[type]}</span><span>${message}</span>`;
  container.appendChild(toast);
  
  setTimeout(() => {
    toast.style.animation = 'slideOut 0.3s ease forwards';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

// Modal controls
function showModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.classList.add('active');
}

function closeModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.classList.remove('active');
}

// Close modal on overlay click
document.addEventListener('click', (e) => {
  if (e.target.classList.contains('modal-overlay')) {
    e.target.classList.remove('active');
  }
});

// Get current user
function getCurrentUser() {
  try {
    return JSON.parse(localStorage.getItem('user')) || { username: 'Guest', level: 1 };
  } catch {
    return { username: 'Guest', level: 1 };
  }
}

// Format number
function formatNumber(n) {
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

// Random int
function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Logout
function logout() {
  localStorage.removeItem('user');
  window.location.href = '/';
}

// Sound effects using Web Audio API
const AudioManager = {
  ctx: null,
  
  init() {
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    } catch(e) {}
  },
  
  playTone(freq, duration, type = 'sine', volume = 0.3) {
    if (!this.ctx) this.init();
    if (!this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
      gain.gain.setValueAtTime(volume, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
      osc.start(this.ctx.currentTime);
      osc.stop(this.ctx.currentTime + duration);
    } catch(e) {}
  },
  
  playDice() {
    [200, 300, 250, 400].forEach((f, i) => {
      setTimeout(() => this.playTone(f, 0.1, 'square', 0.2), i * 60);
    });
  },
  
  playMove() {
    this.playTone(440, 0.15, 'sine', 0.2);
    setTimeout(() => this.playTone(550, 0.15, 'sine', 0.2), 100);
  },
  
  playCapture() {
    [800, 600, 400, 200].forEach((f, i) => {
      setTimeout(() => this.playTone(f, 0.12, 'sawtooth', 0.3), i * 80);
    });
  },
  
  playWin() {
    [523, 659, 784, 1047].forEach((f, i) => {
      setTimeout(() => this.playTone(f, 0.3, 'sine', 0.4), i * 150);
    });
  },
  
  playClick() {
    this.playTone(600, 0.08, 'sine', 0.15);
  },
  
  playError() {
    this.playTone(200, 0.3, 'sawtooth', 0.3);
  },
  
  playLucky() {
    [523, 659, 784, 880, 1047].forEach((f, i) => {
      setTimeout(() => this.playTone(f, 0.2, 'sine', 0.3), i * 100);
    });
  }
};

// AI Voice lines (text-to-speech simulation)
const VoiceLines = {
  capture: [
    "Ăn quân rồi! Về chuồng đi nhé!",
    "Haha! Về vạch xuất phát thôi!",
    "Không thoát được đâu!",
    "Bị ăn rồi, tiếc nhỉ!"
  ],
  lucky: [
    "May mắn quá! Tiến thêm nào!",
    "Ô may mắn! Tuyệt vời!",
    "Số đỏ hôm nay!"
  ],
  unlucky: [
    "Ôi không! Ô xui xẻo!",
    "Xui thật! Lùi lại thôi!",
    "Vận đen đến rồi!"
  ],
  win: [
    "Chiến thắng! Tôi là vô địch!",
    "Xuất sắc! Về đích hết rồi!",
    "Ludo Master Elite!"
  ],
  roll6: [
    "Số 6! Ra quân thôi!",
    "Tuyệt! Số 6 rồi!",
    "Số 6 may mắn!"
  ]
};

function speakVoiceLine(category) {
  const lines = VoiceLines[category];
  if (!lines) return;
  const text = lines[Math.floor(Math.random() * lines.length)];
  
  if ('speechSynthesis' in window) {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'vi-VN';
    utterance.rate = 1.1;
    utterance.pitch = 1.2;
    utterance.volume = 0.8;
    window.speechSynthesis.speak(utterance);
  }
}

// CSS animations injection
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from { transform: translateX(100%); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }
  @keyframes slideOut {
    from { transform: translateX(0); opacity: 1; }
    to { transform: translateX(100%); opacity: 0; }
  }
  @keyframes bounceIn {
    0% { transform: scale(0); opacity: 0; }
    60% { transform: scale(1.2); }
    100% { transform: scale(1); opacity: 1; }
  }
  @keyframes shake {
    0%, 100% { transform: translateX(0); }
    25% { transform: translateX(-8px); }
    75% { transform: translateX(8px); }
  }
  @keyframes diceRoll {
    0% { transform: rotate(0deg) scale(1); }
    25% { transform: rotate(90deg) scale(1.2); }
    50% { transform: rotate(180deg) scale(0.8); }
    75% { transform: rotate(270deg) scale(1.2); }
    100% { transform: rotate(360deg) scale(1); }
  }
  @keyframes pieceJump {
    0% { transform: translateY(0) scale(1); }
    30% { transform: translateY(-30px) scale(1.3); }
    60% { transform: translateY(5px) scale(0.9); }
    80% { transform: translateY(-10px) scale(1.1); }
    100% { transform: translateY(0) scale(1); }
  }
  @keyframes captureEffect {
    0% { transform: scale(1); }
    20% { transform: scale(1.5); }
    40% { transform: scale(0.8) translateY(10px); }
    60% { transform: scale(1.2) translateY(-5px); }
    80% { transform: scale(0.9) translateY(3px); }
    100% { transform: scale(1) translateY(0); }
  }
  @keyframes craterEffect {
    0% { box-shadow: none; }
    50% { box-shadow: inset 0 4px 12px rgba(0,0,0,0.8), 0 0 20px rgba(255,100,0,0.5); }
    100% { box-shadow: inset 0 2px 6px rgba(0,0,0,0.4); }
  }
  @keyframes glowPulse {
    0%, 100% { box-shadow: 0 0 10px currentColor; }
    50% { box-shadow: 0 0 25px currentColor, 0 0 40px currentColor; }
  }
  @keyframes floatUp {
    0% { transform: translateY(0); opacity: 1; }
    100% { transform: translateY(-60px); opacity: 0; }
  }
`;
document.head.appendChild(style);
