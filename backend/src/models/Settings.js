const mongoose = require("mongoose");

const settingsSchema = new mongoose.Schema(
  {
    officeLocation: {
      lat: { type: Number, default: null },
      lng: { type: Number, default: null },
      radiusMeters: { type: Number, default: 100 }
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Settings", settingsSchema);
