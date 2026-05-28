const prisma = require("../../config/db");

async function getProfile(userId) {
  return prisma.user.findUnique({
    where: { id: userId },
  });
}

module.exports = {
  getProfile,
};
