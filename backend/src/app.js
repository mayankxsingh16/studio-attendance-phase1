const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const path = require("path");
const fs = require("fs");

const authRoutes = require("./routes/auth.routes");
const attendanceRoutes = require("./routes/attendance.routes");
const qrRoutes = require("./routes/qr.routes");
const adminRoutes = require("./routes/admin.routes");

const app = express();

// ✅ Correct frontend path
const frontendDistPath = path.join(__dirname, "../../frontend/dist");
console.log("Serving frontend from:", frontendDistPath);

// ✅ Middlewares
app.use(helmet());
app.use(express.json({ limit: "12mb" }));

// ✅ CORS
app.use(cors({ origin: true, credentials: true }));

// ✅ Static uploads
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

// ✅ API routes FIRST
app.use("/api/auth", authRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/qr", qrRoutes);
app.use("/api/admin", adminRoutes);

// ✅ Health route
app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

// ✅ Serve frontend static
app.use(express.static(frontendDistPath));

// ✅ React fallback
app.get("*", (req, res) => {
  const indexPath = path.join(frontendDistPath, "index.html");

  if (!fs.existsSync(indexPath)) {
    console.error("❌ index.html not found at:", indexPath);
    return res.status(500).send("Frontend build not found");
  }

  return res.sendFile(indexPath);
});

// ✅ Error handler
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(err.status || 500).json({
    message: err.message || "Internal server error"
  });
});

module.exports = app;