const mongoose = require("mongoose");

const attendanceSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    date: { type: String, required: true },
    status: {
      type: String,
      enum: ["present", "late"],
      default: "present"
    },
    checkIn: {
      time: { type: Date, required: true },
      isLate: { type: Boolean, default: false },
      location: {
        lat: { type: Number, required: true },
        lng: { type: Number, required: true },
        accuracy: { type: Number, default: 0 }
      },
      photoUrl: { type: String, required: true },
      deviceFingerprint: { type: String, required: true },
      faceVerified: { type: Boolean, default: false },
      faceMatchScore: { type: Number, default: 0 },
      faceVerificationMessage: { type: String, default: "" },
      qrTokenId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "QRToken",
        required: true
      }
    }
  },
  { timestamps: true }
);

attendanceSchema.index({ employee: 1, date: 1 }, { unique: true });

module.exports = mongoose.model("Attendance", attendanceSchema);
