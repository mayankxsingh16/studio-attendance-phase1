const mongoose = require("mongoose");

const qrTokenSchema = new mongoose.Schema(
  {
    token: { type: String, required: true, unique: true },
    validForDate: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    usedBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
      }
    ]
  },
  { timestamps: true }
);

qrTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
qrTokenSchema.index({ validForDate: 1 });

module.exports = mongoose.model("QRToken", qrTokenSchema);
