const prisma = require("../../config/db");

const USER_SELECT = { id: true, username: true, coins: true, level: true, avatar: true };

async function getFriends(userId) {
  const rows = await prisma.friend.findMany({
    where: { userId },
    include: { friend: { select: USER_SELECT } },
  });
  return rows.map((r) => ({ ...r.friend, friendRowId: r.id, status: r.status }));
}

async function getRequests(userId) {
  const rows = await prisma.friendRequest.findMany({
    where: { toId: userId },
    include: { from: { select: USER_SELECT } },
  });
  return rows.map((r) => ({ ...r.from, requestId: r.id }));
}

async function addFriend(userId, friendId) {
  // Tạo quan hệ 2 chiều
  await prisma.friend.createMany({
    data: [
      { userId, friendId },
      { userId: friendId, friendId: userId },
    ],
    skipDuplicates: true,
  });
  return { success: true };
}

async function sendFriendRequest(fromId, toId, username) {
  // Tìm user theo id hoặc username
  let target = null;
  if (toId) {
    target = await prisma.user.findUnique({ where: { id: toId }, select: USER_SELECT });
  } else if (username) {
    target = await prisma.user.findUnique({ where: { username }, select: USER_SELECT });
  }
  if (!target) throw new Error("Không tìm thấy người dùng!");
  if (target.id === fromId) throw new Error("Không thể tự kết bạn với mình!");

  // Kiểm tra đã là bạn chưa
  const existing = await prisma.friend.findFirst({ where: { userId: fromId, friendId: target.id } });
  if (existing) throw new Error("Đã là bạn bè rồi!");

  // Kiểm tra đã gửi request chưa
  const existingReq = await prisma.friendRequest.findFirst({ where: { fromId, toId: target.id } });
  if (existingReq) throw new Error("Đã gửi lời mời rồi!");

  const req = await prisma.friendRequest.create({
    data: { fromId, toId: target.id },
    include: { from: { select: USER_SELECT } },
  });
  return { ...req, target };
}

async function acceptFriendRequest(userId, fromId) {
  // Xóa request
  await prisma.friendRequest.deleteMany({ where: { fromId, toId: userId } });
  // Tạo quan hệ bạn bè 2 chiều
  return addFriend(userId, fromId);
}

async function rejectFriendRequest(userId, fromId) {
  await prisma.friendRequest.deleteMany({ where: { fromId, toId: userId } });
  return { success: true };
}

async function searchUser(query, currentUserId) {
  if (!query || query.length < 2) return [];
  const users = await prisma.user.findMany({
    where: {
      username: { contains: query, mode: "insensitive" },
      id: { not: currentUserId },
    },
    select: USER_SELECT,
    take: 10,
  });
  return users;
}

module.exports = { getFriends, getRequests, addFriend, sendFriendRequest, acceptFriendRequest, rejectFriendRequest, searchUser };
