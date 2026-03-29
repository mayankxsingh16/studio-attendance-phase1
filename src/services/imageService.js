const fs = require("fs/promises");
const path = require("path");

function parseBase64Image(photoBase64) {
  const match = photoBase64.match(/^data:(image\/(png|jpeg|jpg));base64,(.+)$/);
  if (!match) {
    throw Object.assign(new Error("Photo must be a base64 PNG or JPEG data URL."), { status: 400 });
  }

  const mimeType = match[1];
  const extension = mimeType.includes("png") ? "png" : "jpg";
  return {
    extension,
    buffer: Buffer.from(match[3], "base64")
  };
}

exports.parseBase64Image = parseBase64Image;

function parseBase64File(fileBase64) {
  const match = fileBase64.match(
    /^data:(application\/pdf|image\/png|image\/jpeg|image\/jpg);base64,(.+)$/
  );

  if (!match) {
    throw Object.assign(new Error("File must be a base64 PDF, PNG, or JPEG data URL."), { status: 400 });
  }

  const mimeType = match[1];
  let extension = "bin";
  if (mimeType === "application/pdf") extension = "pdf";
  if (mimeType.includes("png")) extension = "png";
  if (mimeType.includes("jpeg") || mimeType.includes("jpg")) extension = "jpg";

  return {
    extension,
    buffer: Buffer.from(match[2], "base64")
  };
}

exports.parseBase64File = parseBase64File;

exports.saveBase64Image = async (photoBase64, userId, prefix = "") => {
  const uploadsDir = path.join(process.cwd(), "uploads");
  await fs.mkdir(uploadsDir, { recursive: true });

  const { extension, buffer } = parseBase64Image(photoBase64);
  const fileName = `${prefix}${userId}-${Date.now()}.${extension}`;
  const filePath = path.join(uploadsDir, fileName);

  await fs.writeFile(filePath, buffer);

  return {
    path: filePath,
    url: `http://localhost:${process.env.PORT || 5000}/uploads/${fileName}`
  };
};

exports.saveBase64File = async (fileBase64, userId, prefix = "doc-") => {
  const uploadsDir = path.join(process.cwd(), "uploads");
  await fs.mkdir(uploadsDir, { recursive: true });

  const { extension, buffer } = parseBase64File(fileBase64);
  const fileName = `${prefix}${userId}-${Date.now()}.${extension}`;
  const filePath = path.join(uploadsDir, fileName);

  await fs.writeFile(filePath, buffer);

  return {
    path: filePath,
    url: `http://localhost:${process.env.PORT || 5000}/uploads/${fileName}`
  };
};
