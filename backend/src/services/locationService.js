const Settings = require("../models/Settings");

function toRadians(value) {
  return (value * Math.PI) / 180;
}

function haversineMeters(lat1, lng1, lat2, lng2) {
  const earthRadius = 6371000;
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadius * c;
}

async function getOfficeConfig() {
  const settings = await Settings.findOne().lean();
  const officeLocation = settings?.officeLocation || {};

  return {
    lat: officeLocation.lat ?? Number(process.env.OFFICE_LAT),
    lng: officeLocation.lng ?? Number(process.env.OFFICE_LNG),
    radiusMeters: officeLocation.radiusMeters ?? Number(process.env.OFFICE_RADIUS_METERS || 100)
  };
}

exports.getOfficeConfig = getOfficeConfig;

exports.validateLocation = async (location) => {
  const officeConfig = await getOfficeConfig();
  const officeLat = Number(officeConfig.lat);
  const officeLng = Number(officeConfig.lng);
  const radiusMeters = Number(officeConfig.radiusMeters || 100);

  if (
    typeof location.lat !== "number" ||
    typeof location.lng !== "number" ||
    typeof location.accuracy !== "number"
  ) {
    throw Object.assign(new Error("Location payload is incomplete."), { status: 400 });
  }

  if (location.accuracy > 100) {
    throw Object.assign(
      new Error("Location accuracy is too low. Move outdoors or enable high-accuracy GPS."),
      { status: 400 }
    );
  }

  const distanceMeters = haversineMeters(officeLat, officeLng, location.lat, location.lng);

  if (distanceMeters > radiusMeters) {
    throw Object.assign(
      new Error(`You are outside the allowed office radius. Distance: ${Math.round(distanceMeters)}m.`),
      { status: 400 }
    );
  }

  return {
    distanceMeters,
    office: officeConfig
  };
};
