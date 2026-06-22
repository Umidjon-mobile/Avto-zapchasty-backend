const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const uploadService = require('../services/upload.service');

// POST /upload/images  (multipart, maydon nomi: images)
const uploadImages = asyncHandler(async (req, res) => {
  if (!req.files || !req.files.length) throw ApiError.badRequest('Rasm yuboring (images)');
  const urls = [];
  for (const file of req.files) {
    urls.push(await uploadService.uploadImage(file));
  }
  res.status(201).json({ urls });
});

module.exports = { uploadImages };
