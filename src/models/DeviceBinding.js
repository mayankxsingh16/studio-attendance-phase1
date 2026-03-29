const mongoose = require("mongoose");

const deviceBindingSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true
    },
    fingerprint: { type: String, required: true },
    userAgent: { type: String, default: "" }
  },
  { timestamps: true }
);

module.exports = mongoose.model("DeviceBinding", deviceBindingSchema);
