const User = require("../models/User");
const DeviceBinding = require("../models/DeviceBinding");
const { signToken } = require("../utils/jwt");
const { saveBase64Image, parseBase64Image } = require("../services/imageService");
const { getImageHashFromBuffer } = require("../services/faceService");
const Attendance = require("../models/Attendance");
const { getTodayDateString, getLateCutoffLabel } = require("../utils/date");

function buildAuthResponse(user) {
  return {
    token: signToken({
      id: user._id.toString(),
      role: user.role,
      name: user.name,
      email: user.email
    }),
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatarUrl: user.avatarUrl || ""
    }
  };
}

exports.login = async (req, res) => {
  const { email, password, deviceFingerprint } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required." });
  }

  const user = await User.findOne({ email: email.toLowerCase() }).select("+password");
  if (!user || !user.isActive) {
    return res.status(401).json({ message: "Invalid credentials." });
  }

  const passwordMatches = await user.comparePassword(password);
  if (!passwordMatches) {
    return res.status(401).json({ message: "Invalid credentials." });
  }

  if (user.role === "employee") {
    if (!deviceFingerprint) {
      return res.status(400).json({ message: "Device fingerprint is required for employees." });
    }

    const existingBinding = await DeviceBinding.findOne({ employee: user._id });

    if (existingBinding && existingBinding.fingerprint !== deviceFingerprint) {
      return res.status(403).json({
        message: "This account is bound to another device. Ask the admin to reset it.",
        code: "DEVICE_MISMATCH"
      });
    }

    if (!existingBinding) {
      await DeviceBinding.create({
        employee: user._id,
        fingerprint: deviceFingerprint,
        userAgent: req.headers["user-agent"] || ""
      });
    }
  }

  res.json(buildAuthResponse(user));
};

exports.me = async (req, res) => {
  const user = await User.findById(req.user.id).select("-password");
  if (!user) {
    return res.status(404).json({ message: "User not found." });
  }

  const responseUser = {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role
  };

  if (user.role === "employee") {
    const [binding, todayAttendance, recentHistory] = await Promise.all([
      DeviceBinding.findOne({ employee: user._id }).lean(),
      Attendance.findOne({ employee: user._id, date: getTodayDateString() }).lean(),
      Attendance.find({ employee: user._id }).sort({ date: -1, createdAt: -1 }).limit(10).lean()
    ]);

    responseUser.phone = user.phone || "";
    responseUser.avatarUrl = user.avatarUrl || "";
    responseUser.documents = user.documents || [];
    responseUser.isActive = user.isActive;
    responseUser.faceReferenceUrl = user.faceReferenceUrl || "";
    responseUser.faceEnrolled = Boolean(user.faceReferenceUrl);
    responseUser.deviceBound = Boolean(binding);
    responseUser.deviceInfo = binding
      ? {
          fingerprint: binding.fingerprint,
          userAgent: binding.userAgent,
          boundAt: binding.createdAt
        }
      : null;
    responseUser.todayAttendance = todayAttendance;
    responseUser.recentHistory = recentHistory;
    responseUser.lateCutoffLabel = getLateCutoffLabel();
  }

  res.json({
    user: responseUser
  });
};

exports.registerEmployee = async (req, res) => {
  const { name, email, password, phone, faceReferenceBase64 } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ message: "Name, email, and password are required." });
  }

  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    return res.status(409).json({ message: "An account with this email already exists." });
  }

  const user = await User.create({
    name,
    email: email.toLowerCase(),
    password,
    phone: phone || "",
    role: "employee"
  });

  if (faceReferenceBase64) {
    const parsed = parseBase64Image(faceReferenceBase64);
    const faceHash = await getImageHashFromBuffer(parsed.buffer);
    const savedImage = await saveBase64Image(faceReferenceBase64, user._id.toString(), "face-ref-");
    user.faceReferenceUrl = savedImage.url;
    user.faceReferenceHash = faceHash;
    await user.save();
  }

  res.status(201).json({
    message: "Employee created successfully.",
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone || "",
      faceReferenceUrl: user.faceReferenceUrl || ""
    }
  });
};
