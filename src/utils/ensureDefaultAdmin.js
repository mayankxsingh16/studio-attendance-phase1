const User = require("../models/User");

async function ensureDefaultAdmin() {
  const existing = await User.findOne({ email: "admin@studio.com" }).select("+password");
  if (existing) {
    const passwordMatches = await existing.comparePassword("Admin@123");

    if (!passwordMatches || existing.role !== "admin" || !existing.isActive) {
      existing.name = "Studio Admin";
      existing.password = "Admin@123";
      existing.role = "admin";
      existing.isActive = true;
      await existing.save();
    }

    return existing;
  }

  return User.create({
    name: "Studio Admin",
    email: "admin@studio.com",
    password: "Admin@123",
    role: "admin"
  });
}

module.exports = ensureDefaultAdmin;
