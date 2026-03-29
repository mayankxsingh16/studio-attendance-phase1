const { generateQRToken, getActiveQRToken } = require("../services/qrService");

exports.generate = async (req, res) => {
  const result = await generateQRToken(req.user.id, {
    forceNew: req.body?.forceNew
  });
  res.status(201).json(result);
};

exports.active = async (_req, res) => {
  const record = await getActiveQRToken();
  res.json({ qr: record });
};
