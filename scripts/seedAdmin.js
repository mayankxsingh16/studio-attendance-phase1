require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const connectDB = require("../src/config/db");
const ensureDefaultAdmin = require("../src/utils/ensureDefaultAdmin");

async function seedAdmin() {
  await connectDB();
  await ensureDefaultAdmin();
  console.log("Admin is ready");
  console.log("Email: admin@studio.com");
  console.log("Password: Admin@123");
  process.exit(0);
}

seedAdmin().catch((error) => {
  console.error("Seed failed:", error);
  process.exit(1);
});
