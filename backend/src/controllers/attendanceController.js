const Attendance = require("../models/Attendance");
const DeviceBinding = require("../models/DeviceBinding");
const User = require("../models/User");
const { validateQRToken, markTokenUsed } = require("../services/qrService");
const { validateLocation } = require("../services/locationService");
const { saveBase64Image, parseBase64Image } = require("../services/imageService");
const { verifyFace } = require("../services/faceService");
const { emitAttendanceEvent } = require("../sockets/attendanceSocket");
const { getTodayDateString, isLateCheckIn } = require("../utils/date");

exports.checkIn = async (req, res) => {
  const { qrToken, location, photoBase64, deviceFingerprint } = req.body;

  if (!qrToken || !location || !photoBase64 || !deviceFingerprint) {
    return res.status(400).json({
      message: "QR token, location, photo, and device fingerprint are required."
    });
  }

  const user = await User.findById(req.user.id);
  if (!user || user.role !== "employee") {
    return res.status(403).json({ message: "Only employees can mark attendance." });
  }

  const binding = await DeviceBinding.findOne({ employee: user._id });
  if (!binding || binding.fingerprint !== deviceFingerprint) {
    return res.status(403).json({ message: "Device verification failed." });
  }

  const date = getTodayDateString();
  const existingAttendance = await Attendance.findOne({ employee: user._id, date });
  if (existingAttendance) {
    return res.status(409).json({ message: "Attendance already marked for today." });
  }

  const qrRecord = await validateQRToken(qrToken, user._id);
  const locationResult = await validateLocation(location);
  const parsedImage = parseBase64Image(photoBase64);
  const imageResult = await saveBase64Image(photoBase64, user._id.toString());
  const late = isLateCheckIn(new Date());
  const faceResult = await verifyFace(user.faceReferenceHash, parsedImage.buffer);

  const attendance = await Attendance.create({
    employee: user._id,
    date,
    status: late ? "late" : "present",
    checkIn: {
      time: new Date(),
      isLate: late,
      location: {
        lat: location.lat,
        lng: location.lng,
        accuracy: location.accuracy
      },
      photoUrl: imageResult.url,
      deviceFingerprint,
      faceVerified: faceResult.verified,
      faceMatchScore: faceResult.score,
      faceVerificationMessage: faceResult.message,
      qrTokenId: qrRecord._id
    }
  });

  await markTokenUsed(qrRecord._id, user._id);

  const livePayload = {
    attendanceId: attendance._id,
    employee: {
      id: user._id,
      name: user.name,
      email: user.email
    },
    status: attendance.status,
    isLate: late,
    photoUrl: imageResult.url,
    time: attendance.checkIn.time,
    faceVerified: faceResult.verified,
    faceMatchScore: faceResult.score
  };
  emitAttendanceEvent(livePayload);

  res.status(201).json({
    message: "Attendance marked successfully.",
    time: attendance.checkIn.time,
    isLate: late,
    distanceMeters: locationResult.distanceMeters,
    photoUrl: imageResult.url,
    faceVerified: faceResult.verified,
    faceMatchScore: faceResult.score,
    faceVerificationMessage: faceResult.message
  });
};

exports.myTodayStatus = async (req, res) => {
  const attendance = await Attendance.findOne({
    employee: req.user.id,
    date: getTodayDateString()
  });

  res.json({ attendance });
};

exports.myHistory = async (req, res) => {
  const records = await Attendance.find({ employee: req.user.id })
    .sort({ date: -1, createdAt: -1 })
    .limit(20);

  res.json({ records });
};
