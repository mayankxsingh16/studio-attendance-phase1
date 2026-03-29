const Attendance = require("../models/Attendance");
const User = require("../models/User");
const DeviceBinding = require("../models/DeviceBinding");
const Settings = require("../models/Settings");
const { getTodayDateString, getLateCutoffLabel } = require("../utils/date");
const { parseBase64Image, saveBase64Image, saveBase64File } = require("../services/imageService");
const { getImageHashFromBuffer } = require("../services/faceService");

function serializeEmployee(employee, bindingMap) {
  return {
    ...employee.toObject(),
    deviceBound: Boolean(bindingMap?.get(employee._id.toString())),
    faceEnrolled: Boolean(employee.faceReferenceUrl)
  };
}

exports.listEmployees = async (_req, res) => {
  const employees = await User.find({ role: "employee" })
    .select("name email phone avatarUrl documents faceReferenceUrl isActive createdAt")
    .sort({ createdAt: -1 });

  const bindings = await DeviceBinding.find({}).lean();
  const bindingMap = new Map(bindings.map((item) => [item.employee.toString(), item]));

  res.json({
    employees: employees.map((employee) => serializeEmployee(employee, bindingMap))
  });
};

exports.getEmployeeProfile = async (req, res) => {
  const employee = await User.findOne({ _id: req.params.id, role: "employee" })
    .select("name email phone avatarUrl documents faceReferenceUrl isActive createdAt");

  if (!employee) {
    return res.status(404).json({ message: "Employee not found." });
  }

  const [binding, todayAttendance, recentAttendance, totals] = await Promise.all([
    DeviceBinding.findOne({ employee: employee._id }).lean(),
    Attendance.findOne({ employee: employee._id, date: getTodayDateString() }).lean(),
    Attendance.find({ employee: employee._id })
      .sort({ date: -1, createdAt: -1 })
      .limit(12)
      .lean(),
    Attendance.aggregate([
      { $match: { employee: employee._id } },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 }
        }
      }
    ])
  ]);

  const stats = {
    totalDays: 0,
    present: 0,
    late: 0
  };

  totals.forEach((item) => {
    stats.totalDays += item.count;
    stats[item._id] = item.count;
  });

  res.json({
    employee: {
      ...serializeEmployee(employee, new Map(binding ? [[employee._id.toString(), binding]] : [])),
      deviceInfo: binding
        ? {
            fingerprint: binding.fingerprint,
            userAgent: binding.userAgent,
            boundAt: binding.createdAt
          }
        : null,
      todayAttendance,
      recentAttendance,
      stats,
      lateCutoffLabel: getLateCutoffLabel()
    }
  });
};

exports.attendanceLogs = async (req, res) => {
  const { status, employeeId, dateFrom, dateTo } = req.query;
  const query = {};

  if (status) {
    query.status = status;
  }

  if (employeeId) {
    query.employee = employeeId;
  }

  if (dateFrom || dateTo) {
    query.date = {};
    if (dateFrom) {
      query.date.$gte = dateFrom;
    }
    if (dateTo) {
      query.date.$lte = dateTo;
    }
  }

  const records = await Attendance.find(query)
    .populate("employee", "name email")
    .sort({ date: -1, "checkIn.time": -1 })
    .limit(100);

  res.json({ records });
};

exports.todayAttendance = async (_req, res) => {
  const records = await Attendance.find({ date: getTodayDateString() })
    .populate("employee", "name email")
    .sort({ "checkIn.time": -1 });

  res.json({ records });
};

exports.dashboardStats = async (_req, res) => {
  const totalEmployees = await User.countDocuments({ role: "employee" });
  const todayDate = getTodayDateString();
  const todayRecords = await Attendance.find({ date: todayDate }).lean();
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
  const startDate = sevenDaysAgo.toISOString().slice(0, 10);

  const recentRecords = await Attendance.find({
    date: { $gte: startDate, $lte: todayDate }
  })
    .populate("employee", "name email")
    .lean();

  const present = todayRecords.filter((item) => item.status === "present").length;
  const late = todayRecords.filter((item) => item.status === "late").length;
  const verifiedToday = todayRecords.filter((item) => item.checkIn?.faceVerified).length;
  const totalTodayFaceChecks = todayRecords.length;

  const dailyMap = new Map();
  for (let offset = 6; offset >= 0; offset -= 1) {
    const date = new Date();
    date.setDate(date.getDate() - offset);
    const key = date.toISOString().slice(0, 10);
    dailyMap.set(key, { date: key, present: 0, late: 0, total: 0 });
  }

  const lateLeaders = new Map();
  let totalCheckInHour = 0;

  recentRecords.forEach((record) => {
    const bucket = dailyMap.get(record.date);
    if (bucket) {
      bucket.total += 1;
      bucket[record.status] += 1;
    }

    if (record.status === "late" && record.employee?._id) {
      const key = record.employee._id.toString();
      const current = lateLeaders.get(key) || {
        employeeId: key,
        name: record.employee.name,
        email: record.employee.email,
        lateCount: 0
      };
      current.lateCount += 1;
      lateLeaders.set(key, current);
    }

    if (record.checkIn?.time) {
      totalCheckInHour += new Date(record.checkIn.time).getHours();
    }
  });

  const weeklyTrend = Array.from(dailyMap.values());
  const topLateEmployees = Array.from(lateLeaders.values())
    .sort((a, b) => b.lateCount - a.lateCount)
    .slice(0, 5);
  const averageCheckInHour =
    recentRecords.length > 0 ? Number((totalCheckInHour / recentRecords.length).toFixed(1)) : 0;
  const faceVerificationRate =
    totalTodayFaceChecks > 0 ? Number(((verifiedToday / totalTodayFaceChecks) * 100).toFixed(1)) : 0;

  res.json({
    totalEmployees,
    present,
    late,
    absent: Math.max(totalEmployees - present - late, 0),
    lateCutoffLabel: getLateCutoffLabel(),
    verifiedToday,
    faceVerificationRate,
    averageCheckInHour,
    weeklyTrend,
    topLateEmployees
  });
};

exports.exportAttendanceCsv = async (req, res) => {
  const dateFrom = req.query.dateFrom || getTodayDateString();
  const dateTo = req.query.dateTo || getTodayDateString();

  const records = await Attendance.find({
    date: { $gte: dateFrom, $lte: dateTo }
  })
    .populate("employee", "name email")
    .sort({ date: 1, "checkIn.time": 1 })
    .lean();

  const header = [
    "Date",
    "Employee",
    "Email",
    "Status",
    "CheckInTime",
    "Latitude",
    "Longitude",
    "Accuracy",
    "PhotoUrl",
    "FaceVerified",
    "FaceMatchScore"
  ];

  const lines = records.map((record) =>
    [
      record.date,
      record.employee?.name || "",
      record.employee?.email || "",
      record.status,
      record.checkIn?.time ? new Date(record.checkIn.time).toISOString() : "",
      record.checkIn?.location?.lat ?? "",
      record.checkIn?.location?.lng ?? "",
      record.checkIn?.location?.accuracy ?? "",
      record.checkIn?.photoUrl || "",
      record.checkIn?.faceVerified ? "Yes" : "No",
      record.checkIn?.faceMatchScore ?? ""
    ]
      .map((value) => `"${String(value).replace(/"/g, '""')}"`)
      .join(",")
  );

  const csv = [header.join(","), ...lines].join("\n");
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename="attendance-${dateFrom}-to-${dateTo}.csv"`);
  res.send(csv);
};

exports.resetDevice = async (req, res) => {
  await DeviceBinding.findOneAndDelete({ employee: req.params.userId });
  res.json({ message: "Device binding reset." });
};

exports.updateEmployeeStatus = async (req, res) => {
  const { isActive } = req.body;

  if (typeof isActive !== "boolean") {
    return res.status(400).json({ message: "isActive must be true or false." });
  }

  const employee = await User.findOneAndUpdate(
    { _id: req.params.id, role: "employee" },
    { isActive },
    { new: true }
  ).select("name email isActive");

  if (!employee) {
    return res.status(404).json({ message: "Employee not found." });
  }

  res.json({
    message: `Employee ${isActive ? "activated" : "deactivated"} successfully.`,
    employee
  });
};

exports.updateEmployee = async (req, res) => {
  const {
    name,
    phone,
    password,
    faceReferenceBase64,
    avatarBase64,
    documents,
    renameDocuments,
    deleteDocuments
  } = req.body;

  const employee = await User.findOne({ _id: req.params.id, role: "employee" }).select("+password");
  if (!employee) {
    return res.status(404).json({ message: "Employee not found." });
  }

  if (typeof name === "string") {
    const trimmedName = name.trim();
    if (!trimmedName) {
      return res.status(400).json({ message: "Name cannot be empty." });
    }
    employee.name = trimmedName;
  }

  if (typeof phone === "string") {
    employee.phone = phone.trim();
  }

  if (typeof avatarBase64 === "string" && avatarBase64.trim()) {
    const savedAvatar = await saveBase64Image(avatarBase64, employee._id.toString(), "avatar-");
    employee.avatarUrl = savedAvatar.url;
  }

  if (typeof password === "string" && password.trim()) {
    if (password.trim().length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters long." });
    }
    employee.password = password.trim();
  }

  if (typeof faceReferenceBase64 === "string" && faceReferenceBase64.trim()) {
    const parsed = parseBase64Image(faceReferenceBase64);
    const faceHash = await getImageHashFromBuffer(parsed.buffer);
    const savedImage = await saveBase64Image(faceReferenceBase64, employee._id.toString(), "face-ref-");
    employee.faceReferenceUrl = savedImage.url;
    employee.faceReferenceHash = faceHash;
  }

  if (Array.isArray(documents) && documents.length > 0) {
    const uploadedDocuments = [];
    for (const document of documents) {
      if (!document?.base64 || !document?.name) {
        continue;
      }
      const savedDocument = await saveBase64File(document.base64, employee._id.toString(), "employee-doc-");
      uploadedDocuments.push({
        name: String(document.name).trim() || "Document",
        url: savedDocument.url,
        uploadedAt: new Date()
      });
    }
    employee.documents = [...(employee.documents || []), ...uploadedDocuments];
  }

  if (Array.isArray(renameDocuments) && renameDocuments.length > 0) {
    const renameMap = new Map(
      renameDocuments
        .filter((item) => item?.url && typeof item?.name === "string")
        .map((item) => [item.url, item.name.trim()])
    );

    employee.documents = (employee.documents || []).map((document) => {
      const nextName = renameMap.get(document.url);
      if (!nextName) {
        return document;
      }

      return {
        ...document.toObject?.(),
        name: nextName || document.name
      };
    });
  }

  if (Array.isArray(deleteDocuments) && deleteDocuments.length > 0) {
    const deleteSet = new Set(deleteDocuments.filter(Boolean));
    employee.documents = (employee.documents || []).filter((document) => !deleteSet.has(document.url));
  }

  await employee.save();

  const binding = await DeviceBinding.findOne({ employee: employee._id }).lean();
  const bindingMap = new Map(binding ? [[employee._id.toString(), binding]] : []);

  res.json({
    message: "Employee updated successfully.",
    employee: serializeEmployee(employee, bindingMap)
  });
};

exports.deleteEmployee = async (req, res) => {
  const employee = await User.findOne({ _id: req.params.id, role: "employee" });
  if (!employee) {
    return res.status(404).json({ message: "Employee not found." });
  }

  await Promise.all([
    Attendance.deleteMany({ employee: employee._id }),
    DeviceBinding.deleteMany({ employee: employee._id }),
    User.deleteOne({ _id: employee._id })
  ]);

  res.json({
    message: "Employee deleted successfully."
  });
};

exports.uploadEmployeeFaceReference = async (req, res) => {
  const { faceReferenceBase64 } = req.body;

  if (!faceReferenceBase64) {
    return res.status(400).json({ message: "faceReferenceBase64 is required." });
  }

  const employee = await User.findOne({ _id: req.params.id, role: "employee" });
  if (!employee) {
    return res.status(404).json({ message: "Employee not found." });
  }

  const parsed = parseBase64Image(faceReferenceBase64);
  const faceHash = await getImageHashFromBuffer(parsed.buffer);
  const savedImage = await saveBase64Image(faceReferenceBase64, employee._id.toString(), "face-ref-");

  employee.faceReferenceUrl = savedImage.url;
  employee.faceReferenceHash = faceHash;
  await employee.save();

  res.json({
    message: "Face reference saved.",
    employee: {
      id: employee._id,
      faceReferenceUrl: employee.faceReferenceUrl
    }
  });
};

exports.getOfficeLocation = async (_req, res) => {
  const settings = await Settings.findOne().lean();

  res.json({
    officeLocation: settings?.officeLocation || {
      lat: Number(process.env.OFFICE_LAT),
      lng: Number(process.env.OFFICE_LNG),
      radiusMeters: Number(process.env.OFFICE_RADIUS_METERS || 100)
    }
  });
};

exports.updateOfficeLocation = async (req, res) => {
  const { lat, lng, radiusMeters } = req.body;

  if ([lat, lng, radiusMeters].some((value) => typeof value !== "number" || Number.isNaN(value))) {
    return res.status(400).json({ message: "lat, lng, and radiusMeters must all be numbers." });
  }

  const settings = await Settings.findOneAndUpdate(
    {},
    {
      officeLocation: { lat, lng, radiusMeters }
    },
    {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true
    }
  );

  res.json({
    message: "Office location updated.",
    officeLocation: settings.officeLocation
  });
};
