const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");
const fs = require("fs/promises");
const path = require("path");

let connected = false;
let memoryServer = null;

async function connectDB() {
  if (connected) {
    return mongoose.connection;
  }

  const targetUri = process.env.MONGODB_URI;

  try {
    await mongoose.connect(targetUri, {
      serverSelectionTimeoutMS: 5000
    });
    connected = true;
    console.log(`MongoDB connected: ${targetUri}`);
    return mongoose.connection;
  } catch (error) {
    const shouldFallback =
      !process.env.DISABLE_IN_MEMORY_DB &&
      targetUri &&
      /127\.0\.0\.1|localhost/.test(targetUri);

    if (!shouldFallback) {
      throw error;
    }

    console.warn("Local MongoDB is unavailable. Falling back to an embedded MongoDB instance with on-disk persistence.");

    if (!memoryServer) {
      const dbPath = path.join(process.cwd(), ".mongo-data");
      await fs.mkdir(dbPath, { recursive: true });

      memoryServer = await MongoMemoryServer.create({
        instance: {
          dbName: "studio-attendance-phase1",
          port: Number(process.env.EMBEDDED_MONGO_PORT || 27018),
          dbPath,
          storageEngine: "wiredTiger"
        }
      });
    }

    const memoryUri = memoryServer.getUri();
    await mongoose.connect(memoryUri);
    connected = true;
    console.log(`Embedded MongoDB started: ${memoryUri}`);
    return mongoose.connection;
  }
}

module.exports = connectDB;
