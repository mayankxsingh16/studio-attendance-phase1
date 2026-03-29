const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const path = require("path");

const authRoutes = require("./routes/auth.routes");
const attendanceRoutes = require("./routes/attendance.routes");
const qrRoutes = require("./routes/qr.routes");
const adminRoutes = require("./routes/admin.routes");

const app = express();
const serveFrontend = process.env.NODE_ENV === "production";
const frontendDistPath = path.join(process.cwd(), "..", "frontend", "dist");

if (serveFrontend) {
  app.set("trust proxy", 1);
}

const allowedOrigins = new Set([
  process.env.FRONTEND_URL,
  "http://localhost:5173",
  "http://127.0.0.1:5173"
].filter(Boolean));

app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.has(origin)) {
        return callback(null, true);
      }

      return callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true
  })
);
app.use(express.json({ limit: "12mb" }));
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

if (serveFrontend) {
  app.use((req, res, next) => {
    if (process.env.REQUIRE_HTTPS === "true" && !req.secure) {
      return res.redirect(`https://${req.headers.host}${req.originalUrl}`);
    }

    return next();
  });
  app.use(express.static(frontendDistPath));
}

app.get("/", (_req, res) => {
  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
  res.type("html").send(`
    <!doctype html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Studio Attendance API</title>
        <style>
          body {
            font-family: Segoe UI, Arial, sans-serif;
            margin: 0;
            padding: 32px;
            background: linear-gradient(180deg, #f4efe6 0%, #eef7fb 100%);
            color: #122230;
          }
          .card {
            max-width: 720px;
            background: rgba(255,255,255,0.95);
            border-radius: 18px;
            padding: 24px;
            box-shadow: 0 16px 40px rgba(17, 32, 49, 0.08);
          }
          a {
            color: #0f766e;
            text-decoration: none;
            font-weight: 600;
          }
          code {
            background: #eef7fb;
            padding: 2px 6px;
            border-radius: 6px;
          }
        </style>
      </head>
      <body>
        <div class="card">
          <h1>Studio Attendance API</h1>
          <p>The backend is running correctly.</p>
          <p>Open the frontend app here: <a href="${frontendUrl}">${frontendUrl}</a></p>
          <p>Health check: <a href="/health">/health</a></p>
          <p>API base: <code>/api</code></p>
        </div>
      </body>
    </html>
  `);
});

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.use("/api/auth", authRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/qr", qrRoutes);
app.use("/api/admin", adminRoutes);

if (serveFrontend) {
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api") || req.path.startsWith("/uploads") || req.path === "/health") {
      return next();
    }

    return res.sendFile(path.join(frontendDistPath, "index.html"));
  });
}

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(err.status || 500).json({
    message: err.message || "Internal server error"
  });
});

module.exports = app;
