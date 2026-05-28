/**
 * Singleton để các module khác (controller, service) có thể emit socket events
 * mà không cần truyền io qua tham số.
 *
 * Cách dùng:
 *   const { getIO } = require('../services/socket.instance');
 *   getIO().to(roomId).emit('event', data);
 */

let _io = null;

function setIO(io) {
  _io = io;
}

function getIO() {
  if (!_io) throw new Error("Socket.IO chưa được khởi tạo. Gọi setIO(io) trước.");
  return _io;
}

module.exports = { setIO, getIO };
