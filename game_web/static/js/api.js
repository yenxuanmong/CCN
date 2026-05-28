/**
 * api.js — Kết nối Node.js Backend (port 3001)
 * Tất cả HTTP calls và Socket.IO đi qua file này.
 * Load file này TRƯỚC mọi file JS khác.
 */

const BACKEND_URL = 'https://ccn-production.up.railway.app';

// ─────────────────────────────────────────────
// AUTH — lưu token + user vào localStorage
// ─────────────────────────────────────────────
const Auth = {
  getToken()  { return localStorage.getItem('token'); },

  setSession(data) {
    // data = { token, user: { id, username, coins, level } }
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    // Xóa playerId cũ khi đăng nhập mới
    localStorage.removeItem('playerId');
  },

  updateUser(fields) {
    const user = this.getUser() || {};
    Object.assign(user, fields);
    localStorage.setItem('user', JSON.stringify(user));
    return user;
  },

  getUser() {
    try { return JSON.parse(localStorage.getItem('user')) || null; }
    catch { return null; }
  },

  clear() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('playerId');
  },

  isLoggedIn() { return !!this.getToken() && !!this.getUser(); },

  // Player record ID (khác với User ID) — được lưu sau khi join room
  getPlayerId()       { return localStorage.getItem('playerId'); },
  setPlayerId(id)     { if (id) localStorage.setItem('playerId', id); },
  clearPlayerId()     { localStorage.removeItem('playerId'); },

  headers() {
    const token = this.getToken();
    return {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': 'Bearer ' + token } : {})
    };
  }
};

// ─────────────────────────────────────────────
// HTTP — wrapper fetch với auth header
// ─────────────────────────────────────────────
const Http = {
  async request(method, path, body) {
    const opts = { method, headers: Auth.headers() };
    if (body !== undefined) opts.body = JSON.stringify(body);
    let res;
    try {
      res = await fetch(BACKEND_URL + path, opts);
    } catch (e) {
      throw new Error('Không kết nối được backend. Kiểm tra Node.js server đang chạy trên port 3001.');
    }
    const text = await res.text();
    let data;
    try { data = JSON.parse(text); } catch { data = { message: text }; }
    if (!res.ok) throw new Error(data.error || data.message || 'HTTP ' + res.status);
    return data;
  },
  get(path)        { return this.request('GET',    path); },
  post(path, body) { return this.request('POST',   path, body); },
  put(path, body)  { return this.request('PUT',    path, body); },
  del(path)        { return this.request('DELETE', path); },
};

// ─────────────────────────────────────────────
// API — tất cả endpoints
// ─────────────────────────────────────────────
const API = {

  // AUTH
  async register(username, password) {
    await Http.post('/api/auth/register', { username, password });
    return this.login(username, password);   // tự đăng nhập sau khi đăng ký
  },

  async login(username, password) {
    const data = await Http.post('/api/auth/login', { username, password });
    Auth.setSession(data);
    return data;
  },

  // USER
  getProfile()          { return Http.get('/api/user/me'); },
  updateProfile(fields) {
    // fields có thể chứa displayName và/hoặc avatar
    // username (tên đăng nhập) KHÔNG được gửi lên để tránh thay đổi
    const { displayName, avatar } = fields;
    return Http.put('/api/user/me', { displayName, avatar }).then(data => {
      Auth.updateUser(data);
      return data;
    });
  },

  // ROOMS
  getRooms()       { return Http.get('/api/room'); },
  getRoom(roomId)  { return Http.get('/api/room/' + roomId); },
  createRoom()     { return Http.post('/api/room', {}); },

  // GAME
  createGame(roomId) { return Http.post('/api/game', { roomId }); },
  getGame(gameId)    { return Http.get('/api/game/' + gameId); },

  // CHAT
  getGlobalMessages()          { return Http.get('/api/chat/global'); },
  getRoomMessages(roomId)      { return Http.get('/api/chat/room/' + roomId); },
  getPrivateMessages(friendId) { return Http.get('/api/chat/private/' + friendId); },

  // FRIENDS
  getFriends()                  { return Http.get('/api/friend'); },
  getFriendRequests()           { return Http.get('/api/friend/requests'); },
  sendFriendRequest(username)   { return Http.post('/api/friend/request', { username }); },
  acceptFriendRequest(fromId)   { return Http.post('/api/friend/accept',  { fromId }); },
  rejectFriendRequest(fromId)   { return Http.post('/api/friend/reject',  { fromId }); },
  searchUser(q)                 { return Http.get('/api/friend/search?q=' + encodeURIComponent(q)); },
};

// ─────────────────────────────────────────────
// SOCKET CLIENT — kết nối Socket.IO đến backend
// ─────────────────────────────────────────────
const SocketClient = {
  socket: null,

  connect() {
    if (this.socket && this.socket.connected) return this.socket;

    // Nếu socket đã tồn tại (đang reconnecting) thì dùng lại, không tạo mới
    if (this.socket) return this.socket;

    this.socket = io(BACKEND_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    this.socket.on('connect', () => {
      console.log('[Socket] Connected:', this.socket.id);
      const user = Auth.getUser();
      if (user) this.socket.emit('join_global', { userId: user.id });
    });

    this.socket.on('disconnect', (r) => console.log('[Socket] Disconnected:', r));
    this.socket.on('connect_error', (e) => console.warn('[Socket] Error:', e.message));

    return this.socket;
  },

  disconnect() {
    if (this.socket) { this.socket.disconnect(); this.socket = null; }
  },

  emit(event, data) {
    if (!this.socket || !this.socket.connected) this.connect();
    this.socket.emit(event, data);
  },

  on(event, handler) {
    if (!this.socket) this.connect();
    this.socket.on(event, handler);
  },

  off(event, handler) {
    if (this.socket) this.socket.off(event, handler);
  },

  once(event, handler) {
    if (!this.socket) this.connect();
    this.socket.once(event, handler);
  },

  // ROOM
  joinRoom(roomId) {
    const u = Auth.getUser(); if (!u) return;
    this.emit('join_room', { roomId, userId: u.id });
    // Lắng nghe player_assigned để lưu Player record ID
    this.once('player_assigned', (data) => {
      if (data && data.playerId) Auth.setPlayerId(data.playerId);
    });
  },
  leaveRoom(roomId) {
    const u = Auth.getUser(); if (!u) return;
    this.emit('leave_room', { roomId, userId: u.id });
  },
  sendRoomInvite(toUserId, roomId) {
    const u = Auth.getUser(); if (!u) return;
    this.emit('room_invite', { fromUserId: u.id, toUserId, roomId });
  },

  // GAME
  rollDice(gameId) {
    const u = Auth.getUser(); if (!u) return;
    // Ưu tiên dùng Player record ID (lưu sau join_room), fallback về userId
    const playerId = Auth.getPlayerId() || u.id;
    this.emit('roll_dice', { gameId, playerId });
  },
  moveHorse(gameId, horseIndex) {
    const u = Auth.getUser(); if (!u) return;
    const playerId = Auth.getPlayerId() || u.id;
    this.emit('move_horse', { gameId, playerId, horseIndex });
  },

  // CHAT
  sendGlobalMessage(content) {
    const u = Auth.getUser(); if (!u) return;
    this.emit('send_message', { userId: u.id, content });
  },
  sendRoomMessage(roomId, content) {
    const u = Auth.getUser(); if (!u) return;
    this.emit('send_message', { userId: u.id, roomId, content });
  },
  sendPrivateMessage(toId, content) {
    const u = Auth.getUser(); if (!u) return;
    this.emit('join_private',  { userId: u.id, friendId: toId });
    this.emit('send_message',  { userId: u.id, toId, content });
  },
  joinPrivateChat(friendId) {
    const u = Auth.getUser(); if (!u) return;
    this.emit('join_private', { userId: u.id, friendId });
  },

  // MATCHMAKING
  findMatch() {
    const u = Auth.getUser(); if (!u) return;
    this.emit('find_match', { userId: u.id });
  },
};

// ─────────────────────────────────────────────
// GUARD — redirect về login nếu chưa đăng nhập
// ─────────────────────────────────────────────
function requireAuth() {
  if (!Auth.isLoggedIn()) {
    window.location.href = '/';
    return false;
  }
  return true;
}

// ─────────────────────────────────────────────
// EXPORT ra window
// ─────────────────────────────────────────────
window.BACKEND_URL  = BACKEND_URL;
window.Auth         = Auth;
window.Http         = Http;
window.API          = API;
window.SocketClient = SocketClient;
window.requireAuth  = requireAuth;
