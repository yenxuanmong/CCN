const { randomUUID } = require("crypto");

function generateRoomCode() {
  // 6 ký tự hex ngẫu nhiên → ~16 triệu khả năng, giảm đáng kể xác suất trùng
  return "LUDO-" + Math.random().toString(36).substring(2, 8).toUpperCase();
}

function generateId() {
  return randomUUID();
}

module.exports = {
  generateRoomCode,
  generateId,
};
