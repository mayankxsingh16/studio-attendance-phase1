const { Jimp } = require("jimp");

async function getImageHashFromBuffer(buffer) {
  try {
    const image = await Jimp.read(buffer);
    image.resize({ w: 128, h: 128 }).greyscale();
    return image.hash();
  } catch (_error) {
    throw Object.assign(
      new Error("Face image could not be processed. Upload a clear PNG or JPEG image and try again."),
      { status: 400 }
    );
  }
}

function hammingDistance(a, b) {
  if (!a || !b || a.length !== b.length) {
    return Number.MAX_SAFE_INTEGER;
  }

  let distance = 0;
  for (let index = 0; index < a.length; index += 1) {
    if (a[index] !== b[index]) {
      distance += 1;
    }
  }
  return distance;
}

async function verifyFace(referenceHash, liveBuffer) {
  if (!referenceHash) {
    return {
      verified: false,
      score: 0,
      message: "No reference face enrolled for this employee."
    };
  }

  const liveHash = await getImageHashFromBuffer(liveBuffer);
  const distance = hammingDistance(referenceHash, liveHash);
  const score = Math.max(0, 1 - distance / referenceHash.length);
  const verified = score >= Number(process.env.FACE_MATCH_THRESHOLD || 0.72);

  return {
    verified,
    score: Number(score.toFixed(3)),
    message: verified ? "Face verified successfully." : "Face verification score was below the threshold.",
    liveHash
  };
}

module.exports = {
  getImageHashFromBuffer,
  verifyFace
};
