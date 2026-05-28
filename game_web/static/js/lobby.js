/* ===== LOBBY - Global Chat Realtime + Friends + Private Chat ===== */

let currentUser;

// Fallback chỉ dùng khi không kết nối được backend — id đặt null để vô hiệu nút Join
const FALLBACK_ROOMS = [
  { id: null, name: 'Phòng của Duy_Beo',  players: [{}],       maxPlayers: 4, code: 'LUDO-1024' },
  { id: null, name: 'Chiến thần ludo',    players: [{},{},{}], maxPlayers: 4, code: 'LUDO-2048' },
  { id: null, name: 'Noob Friendly',       players: [{}],       maxPlayers: 4, code: 'LUDO-3072' },
];

// ==================== INIT ====================

document.addEventListener('DOMContentLoaded', async () => {
  if (!requireAuth()) return;

  currentUser = Auth.getUser();
  initUI();

  // Kết nối socket → tự động join 'global' trong SocketClient.connect()
  SocketClient.connect();
  bindSocketEvents();

  // Load dữ liệu song song
  await Promise.all([loadRooms(), loadFriends(), loadGlobalHistory()]);

  // Auto-refresh rooms mỗi 15s
  setInterval(loadRooms, 15000);
});

function initUI() {
  const u = currentUser;
  // Ưu tiên displayName, fallback về username
  const name    = u.displayName || u.username || 'Player';
  const initial = name.charAt(0).toUpperCase();
  const $ = (id) => document.getElementById(id);
  if ($('sidebarAvatar'))   $('sidebarAvatar').textContent   = initial;
  if ($('topbarAvatar'))    $('topbarAvatar').textContent    = initial;
  if ($('sidebarUsername')) $('sidebarUsername').textContent = name;
  if ($('topbarCoins'))     $('topbarCoins').textContent     = formatNumber(u.coins || 0);
}

// ==================== SOCKET EVENTS ====================

// Lưu handlers vào biến cố định để có thể off/on đúng cách (tránh duplicate)
const _socketHandlers = {};

function bindSocketEvents() {
  // Xóa tất cả handlers cũ trước khi đăng ký lại
  Object.entries(_socketHandlers).forEach(([event, fn]) => {
    SocketClient.socket?.off(event, fn);
  });

  _socketHandlers.receive_message = (msg) => {
    if (!msg.toId && !msg.roomId) {
      appendGlobalMessage(msg);
    } else if (msg.toId) {
      const openFriendId = document.getElementById('privateChatModal')?.dataset.friendId;
      const isMyMsg      = msg.userId === currentUser.id;
      const isFriendMsg  = msg.userId === openFriendId || msg.toId === openFriendId;
      if (openFriendId && (isMyMsg || isFriendMsg)) {
        appendPrivateMessage(msg);
      }
      if (!isMyMsg) showPrivateBadge(msg.userId);
    }
  };

  _socketHandlers.player_joined = () => loadRooms();
  _socketHandlers.player_left   = () => loadRooms();

  // Phòng bị xóa (không còn ai) → refresh list ngay
  _socketHandlers.room_deleted  = () => loadRooms();

  _socketHandlers.match_found = (room) => {
    showToast('Tìm được trận! Đang vào phòng...', 'success');
    setTimeout(() => window.location.href = `/room/${room.id}`, 800);
  };

  _socketHandlers.new_friend_request = (data) => {
    const name = data.username || 'Ai đó';
    showToast(`${name} muốn kết bạn với bạn! 👋`, 'info', 5000);
    loadFriends();
  };

  _socketHandlers.room_invite = (data) => {
    // Hiện toast đặc biệt với nút vào phòng
    showRoomInviteToast(data);
  };

  // Đăng ký tất cả handlers
  Object.entries(_socketHandlers).forEach(([event, fn]) => {
    SocketClient.socket.off(event, fn); // đảm bảo không trùng
    SocketClient.socket.on(event, fn);
  });
}

// ==================== ROOMS ====================

async function loadRooms() {
  try {
    const rooms = await API.getRooms();
    renderRooms(rooms); // Hiển thị đúng kết quả từ server, kể cả mảng rỗng
  } catch {
    // Chỉ dùng fallback khi không kết nối được backend
    renderRooms(FALLBACK_ROOMS);
  }
}

function renderRooms(rooms) {
  const list = document.getElementById('roomList');
  if (!list) return;

  if (!rooms || rooms.length === 0) {
    list.innerHTML = `<div style="text-align:center;padding:40px;color:#4a4a6a;">
      <div style="font-size:40px;margin-bottom:12px;">🎲</div>
      <div>Chưa có phòng nào. Hãy tạo phòng mới!</div></div>`;
    return;
  }

  list.innerHTML = rooms.map(room => {
    const count   = room.playerCount ?? (Array.isArray(room.players) ? room.players.length : 0);
    const max     = room.maxPlayers || room.max_players || 4;
    const code    = room.code || room.id || '????';
    const name    = room.name || 'Phòng chơi';
    const isFull  = count >= max;
    const noId    = !room.id; // phòng demo từ fallback
    const slots   = Array.from({ length: max }, (_, i) =>
      i < count
        ? `<div class="player-slot">${String.fromCharCode(65 + i)}</div>`
        : `<div class="player-slot empty">+</div>`
    ).join('');

    const btnDisabled = isFull || noId;
    const btnLabel    = isFull ? 'Phòng đầy' : noId ? 'Demo' : 'Join';
    const btnStyle    = btnDisabled ? 'opacity:.5;cursor:not-allowed;' : '';

    return `<div class="room-card">
      <div class="room-card-header">
        <div>
          <div class="room-name">${name}</div>
          <div class="room-bet">Mã: ${code}</div>
        </div>
        <div class="room-players">
          <span>👤</span>
          <span style="color:${isFull ? '#ff4d6d' : 'inherit'}">${count}/${max}</span>
        </div>
      </div>
      <div class="player-slots">${slots}</div>
      <button class="btn-join" ${btnDisabled ? `disabled style="${btnStyle}"` : ''}
        ${!btnDisabled ? `onclick="joinRoom('${room.id}')"` : ''}>
        ${btnLabel}
      </button>
    </div>`;
  }).join('');
}

async function joinRoom(roomId) {
  AudioManager.playClick();
  showToast('Đang vào phòng...', 'info');
  window.location.href = `/room/${roomId}`;
}

async function quickMatch() {
  AudioManager.playClick();
  showToast('Đang tìm trận nhanh...', 'info');
  SocketClient.findMatch();
}

function showCreateRoom() {
  AudioManager.playClick();
  const nameInput = document.getElementById('roomName');
  if (nameInput) nameInput.value = `Phòng của ${currentUser.username}`;
  showModal('createRoomModal');
}

async function createRoom() {
  AudioManager.playClick();
  const btn = document.querySelector('#createRoomModal .btn-primary');
  if (btn) { btn.disabled = true; btn.textContent = '⏳ Đang tạo...'; }
  try {
    const room = await API.createRoom();
    closeModal('createRoomModal');
    showToast('Tạo phòng thành công!', 'success');
    setTimeout(() => window.location.href = `/room/${room.id}`, 500);
  } catch (err) {
    showToast(err.message || 'Tạo phòng thất bại', 'error');
    if (btn) { btn.disabled = false; btn.textContent = 'Tạo phòng'; }
  }
}

// ==================== GLOBAL CHAT ====================

async function loadGlobalHistory() {
  try {
    const msgs = await API.getGlobalMessages();
    const container = document.getElementById('chatMessages');
    if (container) container.innerHTML = '';
    msgs.forEach(m => appendGlobalMessage({
      userId:      m.fromId,
      username:    m.from?.username    || 'Unknown',
      displayName: m.from?.displayName || m.from?.username || 'Unknown',
      content:     m.content,
      me:          m.fromId === currentUser.id,
    }));
  } catch {
    // Hiển thị tin nhắn mẫu nếu backend offline
    [
      { username: 'Clover_King',   content: 'Có ai solo 20k không?' },
      { username: 'Xuka_Dethuong', content: 'Mới thắng được 1 trận hú hồn quá kkk' },
      { username: 'Hacker_Ludo',   content: 'Phòng 1024 đang thiếu 1 chân nè.' },
    ].forEach(m => appendGlobalMessage(m));
  }
}

function appendGlobalMessage(msg) {
  const container = document.getElementById('chatMessages');
  if (!container) return;

  const isMe = msg.me || msg.userId === currentUser?.id;
  // Ưu tiên displayName, fallback về username
  const name = msg.displayName || msg.username || msg.userId || 'Unknown';
  const text = msg.content || msg.message || msg.text || '';

  const div = document.createElement('div');
  div.className = 'chat-message';
  div.innerHTML = `
    <div class="sender ${isMe ? 'me' : ''}">${isMe ? 'Tôi' : name}</div>
    <div class="${isMe ? 'bubble-me' : ''} text">${escapeHtml(text)}</div>`;
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
}

function sendGlobalMessage() {
  const input = document.getElementById('chatInput');
  const text  = input.value.trim();
  if (!text) return;
  input.value = '';

  // KHÔNG optimistic append — để socket receive_message xử lý
  // (tránh hiện 2 lần vì backend broadcast lại cho chính mình)
  SocketClient.sendGlobalMessage(text);
}

// Alias để lobby.html gọi onclick="sendMessage()"
function sendMessage() { sendGlobalMessage(); }

// ==================== FRIENDS ====================

async function loadFriends() {
  try {
    const [friends, requests] = await Promise.all([
      API.getFriends(),
      API.getFriendRequests(),
    ]);
    renderFriends(friends);
    renderRequests(requests);

    const badge    = document.getElementById('friendBadge');
    const reqCount = document.getElementById('reqCount');
    if (badge)    { badge.style.display = requests.length > 0 ? 'inline' : 'none'; badge.textContent = requests.length; }
    if (reqCount) reqCount.textContent = requests.length;
  } catch {
    renderFriends([
      { id: 'f1', username: 'Dark_Horse_99', status: 'ONLINE'  },
      { id: 'f2', username: 'Ludo_Queen',    status: 'INGAME'  },
      { id: 'f3', username: 'Old_Timer',     status: 'OFFLINE' },
    ]);
  }
}

function renderFriends(friends) {
  const list = document.getElementById('friendsList');
  if (!list) return;

  const statusText = { ONLINE: 'Đang trực tuyến', OFFLINE: 'Offline', INGAME: 'Đang chơi' };
  const statusCls  = { ONLINE: 'online', OFFLINE: '', INGAME: 'online' };

  list.innerHTML = friends.map(f => {
    const name   = f.username || 'Unknown';
    const status = f.status || 'OFFLINE';
    return `<div class="friend-item">
      <div class="avatar avatar-sm" style="background:linear-gradient(135deg,${status !== 'OFFLINE' ? '#4a6cf7,#a855f7' : '#2a2a40,#1a1a2e'})">
        ${name.charAt(0)}
      </div>
      <div class="friend-info">
        <div class="friend-name">${name}</div>
        <div class="friend-status ${statusCls[status] || ''}">${statusText[status] || status}</div>
      </div>
      <div class="friend-actions">
        <button class="friend-action-btn" title="Chat riêng" onclick="openPrivateChat('${f.id}','${name}')">
          💬 <span id="badge-${f.id}" style="display:none;background:#ff4d6d;border-radius:50%;width:8px;height:8px;position:absolute;top:2px;right:2px;"></span>
        </button>
        ${status !== 'OFFLINE' ? `<button class="friend-action-btn" title="Mời vào phòng" onclick="inviteFriend('${name}')">📨</button>` : ''}
      </div>
    </div>`;
  }).join('') || '<div style="padding:12px;color:#4a4a6a;font-size:13px;text-align:center;">Chưa có bạn bè</div>';
}

function renderRequests(requests) {
  const list = document.getElementById('requestsList');
  if (!list) return;

  list.innerHTML = requests.map(r => {
    const name = r.username || 'Unknown';
    const id   = r.id || r.requestId || '';
    return `<div class="friend-item">
      <div class="avatar avatar-sm">${name.charAt(0)}</div>
      <div class="friend-info">
        <div class="friend-name">${name}</div>
        <div class="friend-status">Muốn kết bạn</div>
      </div>
      <div class="friend-actions">
        <button class="friend-action-btn" style="background:#16a34a;border-color:#16a34a;" onclick="acceptFriend('${id}')">✓</button>
        <button class="friend-action-btn" style="background:#dc2626;border-color:#dc2626;" onclick="rejectFriend('${id}')">✕</button>
      </div>
    </div>`;
  }).join('') || '<div style="padding:12px;color:#4a4a6a;font-size:13px;text-align:center;">Không có lời mời</div>';
}

function switchFriendTab(tab) {
  document.getElementById('friendsList').style.display    = tab === 'friends'  ? 'block' : 'none';
  document.getElementById('requestsList').style.display   = tab === 'requests' ? 'block' : 'none';
  document.querySelectorAll('.friend-tab').forEach((btn, i) => {
    btn.classList.toggle('active', (i === 0 && tab === 'friends') || (i === 1 && tab === 'requests'));
  });
}

async function acceptFriend(fromId) {
  try {
    await API.acceptFriendRequest(fromId);
    showToast('Đã kết bạn!', 'success');
    loadFriends();
  } catch (err) { showToast(err.message, 'error'); }
}

async function rejectFriend(fromId) {
  try {
    await API.rejectFriendRequest(fromId);
    showToast('Đã từ chối lời mời', 'info');
    loadFriends();
  } catch (err) { showToast(err.message, 'error'); }
}

function inviteFriend(username) {
  showToast(`Đã gửi lời mời đến ${username}!`, 'success');
}

// Tìm và gửi lời mời kết bạn theo username
async function sendFriendRequest() {
  const input    = document.getElementById('addFriendInput');
  const username = input.value.trim();
  if (!username) return;

  try {
    await API.sendFriendRequest(username);
    showToast(`Đã gửi lời mời kết bạn đến ${username}!`, 'success');
    input.value = '';
  } catch (err) {
    showToast(err.message || 'Không tìm thấy người dùng', 'error');
  }
}

// ==================== PRIVATE CHAT ====================

let privateChatFriendId   = null;
let privateChatFriendName = null;

function openPrivateChat(friendId, friendName) {
  privateChatFriendId   = friendId;
  privateChatFriendName = friendName;

  // Cập nhật tiêu đề modal
  const titleEl = document.getElementById('privateChatTitle');
  if (titleEl) titleEl.textContent = `💬 Chat với ${friendName}`;

  // Lưu friendId vào modal để nhận tin nhắn đúng
  const modal = document.getElementById('privateChatModal');
  if (modal) modal.dataset.friendId = friendId;

  // Join private socket room
  SocketClient.joinPrivateChat(friendId);

  // Load lịch sử
  loadPrivateHistory(friendId);

  // Xóa badge
  const badge = document.getElementById(`badge-${friendId}`);
  if (badge) badge.style.display = 'none';

  showModal('privateChatModal');
  setTimeout(() => document.getElementById('privateInput')?.focus(), 100);
}

async function loadPrivateHistory(friendId) {
  const container = document.getElementById('privateChatMessages');
  if (!container) return;
  container.innerHTML = '<div style="text-align:center;color:#4a4a6a;padding:20px;font-size:13px;">Đang tải...</div>';

  try {
    const msgs = await API.getPrivateMessages(friendId);
    container.innerHTML = '';
    if (msgs.length === 0) {
      container.innerHTML = '<div style="text-align:center;color:#4a4a6a;padding:20px;font-size:13px;">Chưa có tin nhắn nào. Hãy bắt đầu cuộc trò chuyện!</div>';
      return;
    }
    msgs.forEach(m => appendPrivateMessage({
      userId:   m.fromId,
      username: m.from?.username || 'Unknown',
      content:  m.content,
      me:       m.fromId === currentUser.id,
    }));
  } catch {
    container.innerHTML = '<div style="text-align:center;color:#4a4a6a;padding:20px;font-size:13px;">Không thể tải tin nhắn</div>';
  }
}

function appendPrivateMessage(msg) {
  const container = document.getElementById('privateChatMessages');
  if (!container) return;

  const isMe = msg.me || msg.userId === currentUser?.id;
  const text = msg.content || msg.message || msg.text || '';

  const div = document.createElement('div');
  div.style.cssText = `display:flex;flex-direction:column;align-items:${isMe ? 'flex-end' : 'flex-start'};margin-bottom:10px;`;
  div.innerHTML = `
    ${!isMe ? `<div style="font-size:11px;color:#8b8fa8;margin-bottom:3px;">${msg.username || 'Unknown'}</div>` : ''}
    <div style="
      max-width:75%;padding:9px 13px;border-radius:${isMe ? '14px 14px 4px 14px' : '14px 14px 14px 4px'};
      background:${isMe ? 'linear-gradient(135deg,#4a6cf7,#6c8fff)' : '#2a2a40'};
      color:white;font-size:13px;line-height:1.4;word-break:break-word;">
      ${escapeHtml(text)}
    </div>
    <div style="font-size:10px;color:#4a4a6a;margin-top:3px;">${formatTime(msg.createdAt)}</div>`;
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
}

function sendPrivateMessage() {
  const input = document.getElementById('privateInput');
  const text  = input.value.trim();
  if (!text || !privateChatFriendId) return;
  input.value = '';

  // KHÔNG optimistic append — để socket receive_message xử lý
  // (tránh hiện 2 lần vì backend broadcast lại cho chính mình)
  SocketClient.sendPrivateMessage(privateChatFriendId, text);
}

function showPrivateBadge(fromUserId) {
  // Chỉ hiện badge nếu modal không đang mở với người đó
  if (privateChatFriendId === fromUserId) return;
  const badge = document.getElementById(`badge-${fromUserId}`);
  if (badge) badge.style.display = 'block';
}

// ==================== HELPERS ====================

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatTime(iso) {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  } catch { return ''; }
}

function showFriends()  { showToast('Mở danh sách bạn bè', 'info'); }
function showSettings() { showToast('Cài đặt đang phát triển', 'info'); }
function filterRooms()  { showToast('Tính năng lọc đang phát triển', 'info'); }

// ==================== ROOM INVITE TOAST ====================

function showRoomInviteToast(data) {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  toast.style.cssText = `
    background:#1a1a2e; border:1px solid #4a6cf7; border-radius:14px;
    padding:14px 16px; min-width:280px; max-width:320px;
    box-shadow:0 8px 30px rgba(74,108,247,0.3);
    font-family:Inter,sans-serif; color:white;
    animation:slideIn 0.3s ease;
  `;
  toast.innerHTML = `
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;">
      <div style="width:36px;height:36px;background:linear-gradient(135deg,#4a6cf7,#a855f7);
        border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0;">
        🎮
      </div>
      <div>
        <div style="font-size:13px;font-weight:700;">${escapeHtml(data.fromName)} mời bạn vào phòng!</div>
        <div style="font-size:11px;color:#8b8fa8;margin-top:2px;">${escapeHtml(data.roomName || data.roomCode)}</div>
      </div>
    </div>
    <div style="display:flex;gap:8px;">
      <button onclick="acceptRoomInvite('${data.roomId}', this.closest('div').parentElement)"
        style="flex:1;padding:8px;background:linear-gradient(135deg,#4a6cf7,#6c8fff);
        border:none;border-radius:8px;color:white;font-size:12px;font-weight:700;cursor:pointer;">
        ✓ Vào phòng
      </button>
      <button onclick="this.closest('div').parentElement.remove()"
        style="padding:8px 12px;background:#2a2a40;border:none;border-radius:8px;
        color:#8b8fa8;font-size:12px;cursor:pointer;">
        ✕
      </button>
    </div>
  `;
  container.appendChild(toast);
  // Tự xóa sau 15 giây
  setTimeout(() => toast.remove(), 15000);
}

async function acceptRoomInvite(roomId, toastEl) {
  if (toastEl) toastEl.remove();
  showToast('Đang vào phòng...', 'info');
  window.location.href = '/room/' + roomId;
}
