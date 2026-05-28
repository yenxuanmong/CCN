const prisma = require("../../config/db");

const USER_SELECT = {
  id: true, username: true, displayName: true,
  avatar: true, level: true, xp: true, coins: true, rank: true, createdAt: true,
};

exports.getProfile = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: USER_SELECT,
    });
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const { displayName, avatar } = req.body;
    const updateData = {};

    // Chỉ cập nhật displayName và avatar — username (tên đăng nhập) KHÔNG thay đổi
    if (displayName !== undefined) updateData.displayName = displayName.trim() || null;
    if (avatar      !== undefined) updateData.avatar      = avatar;

    const user = await prisma.user.update({
      where: { id: req.user.userId },
      data:  updateData,
      select: USER_SELECT,
    });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
