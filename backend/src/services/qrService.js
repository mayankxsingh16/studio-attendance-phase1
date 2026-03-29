const crypto = require("crypto");
const QRToken = require("../models/QRToken");
const { getTodayDateString } = require("../utils/date");

function buildToken() {
  return crypto.randomBytes(24).toString("hex");
}

function getEndOfToday() {
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  return end;
}

exports.generateQRToken = async (adminId, options = {}) => {
  const forceNew = Boolean(options.forceNew);
  const validForDate = getTodayDateString();
  const expiresAt = getEndOfToday();

  await QRToken.deleteMany({ expiresAt: { $lt: new Date() } });

  const existingQr = await QRToken.findOne({
    validForDate,
    expiresAt: { $gt: new Date() }
  }).sort({ createdAt: -1 });

  if (existingQr && !forceNew) {
    return {
      token: existingQr.token,
      expiresAt: existingQr.expiresAt,
      validForDate: existingQr.validForDate,
      reused: true
    };
  }

  if (existingQr && forceNew) {
    await QRToken.deleteMany({ validForDate });
  }

  const token = buildToken();
  const qr = await QRToken.create({
    token,
    validForDate,
    expiresAt,
    createdBy: adminId,
    usedBy: []
  });

  return {
    token: qr.token,
    expiresAt: qr.expiresAt,
    validForDate: qr.validForDate,
    reused: false,
    forced: forceNew
  };
};

exports.getActiveQRToken = async () => {
  return QRToken.findOne({
    validForDate: getTodayDateString(),
    expiresAt: { $gt: new Date() }
  }).sort({ createdAt: -1 });
};

exports.validateQRToken = async (token, employeeId) => {
  const qr = await QRToken.findOne({ token });

  if (!qr) {
    const activeToday = await exports.getActiveQRToken();
    throw Object.assign(
      new Error(
        activeToday
          ? "This QR is no longer active. Please scan the latest QR shown by the admin."
          : "No active QR is available right now. Ask the admin to generate today's QR."
      ),
      {
        status: 400,
        code: activeToday ? "QR_OUTDATED" : "QR_MISSING"
      }
    );
  }

  if (qr.expiresAt <= new Date()) {
    throw Object.assign(new Error("This QR token has expired."), { status: 400 });
  }

  if (qr.validForDate !== getTodayDateString()) {
    throw Object.assign(new Error("This QR belongs to a previous day. Please scan today's QR."), {
      status: 400,
      code: "QR_OLD_DAY"
    });
  }

  const alreadyUsed = qr.usedBy.some((item) => item.toString() === employeeId.toString());
  if (alreadyUsed) {
    throw Object.assign(new Error("You have already used this QR token."), { status: 409 });
  }

  return qr;
};

exports.markTokenUsed = async (qrId, employeeId) => {
  await QRToken.findByIdAndUpdate(qrId, {
    $addToSet: { usedBy: employeeId }
  });
};
