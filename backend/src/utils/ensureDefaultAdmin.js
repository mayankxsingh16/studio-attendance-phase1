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

    await ensureDemoEmployee();
    return existing;
  }

  const admin = await User.create({
    name: "Studio Admin",
    email: "admin@studio.com",
    password: "Admin@123",
    role: "admin"
  });

  await ensureDemoEmployee();
  return admin;
}

async function ensureDemoEmployee() {
  const existing = await User.findOne({ email: "employee@studio.com" }).select("+password");
  if (existing) {
    const passwordMatches = await existing.comparePassword("Employee@123");

    if (!passwordMatches || existing.role !== "employee" || !existing.isActive) {
      existing.name = "Demo Employee";
      existing.password = "Employee@123";
      existing.role = "employee";
      existing.isActive = true;
      await existing.save();
    }

    return existing;
  }

  return User.create({
    name: "Demo Employee",
    email: "employee@studio.com",
    password: "Employee@123",
    role: "employee"
  });
}

module.exports = ensureDefaultAdmin;
