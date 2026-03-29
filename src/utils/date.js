exports.getLateCutoffConfig = () => ({
  hour: Number(process.env.LATE_AFTER_HOUR || 9),
  minute: Number(process.env.LATE_AFTER_MINUTE || 35)
});

exports.getLateCutoffLabel = () => {
  const { hour, minute } = exports.getLateCutoffConfig();
  const suffix = hour >= 12 ? "PM" : "AM";
  const normalizedHour = hour % 12 || 12;
  return `${String(normalizedHour).padStart(2, "0")}:${String(minute).padStart(2, "0")} ${suffix}`;
};

exports.isWeekendDateString = (dateString) => {
  const date = new Date(`${dateString}T00:00:00`);
  const day = date.getDay();
  return day === 0 || day === 6;
};

exports.getTodayDateString = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

exports.isLateCheckIn = (value) => {
  const date = new Date(value);
  const { hour: lateHour, minute: lateMinute } = exports.getLateCutoffConfig();
  const cutoff = new Date(value);
  cutoff.setHours(lateHour, lateMinute, 0, 0);
  return date > cutoff;
};
