const router = require('express').Router();
const multer = require('multer');
const c = require('../controllers/upload.controller');
const { auth } = require('../middleware/auth');
const ApiError = require('../utils/ApiError');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 10 }, // 5MB, 10 ta
  fileFilter: (req, file, cb) => {
    if (/^image\/(jpe?g|png|webp|gif|heic|heif)$/i.test(file.mimetype)) cb(null, true);
    else cb(new Error('Faqat rasm (jpg, png, webp, gif, heic)'));
  },
});

const uploadImages = upload.array('images', 10);

// multer xatolarini 400 ga aylantirish (aks holda global handler 500 qaytaradi)
function handleUpload(req, res, next) {
  uploadImages(req, res, (err) => {
    if (!err) return next();
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') return next(ApiError.badRequest('Rasm hajmi 5MB dan oshmasin'));
      if (err.code === 'LIMIT_FILE_COUNT') return next(ApiError.badRequest('Eng ko‘pi 10 ta rasm'));
      return next(ApiError.badRequest(err.message));
    }
    return next(ApiError.badRequest(err.message));
  });
}

router.post('/images', auth, handleUpload, c.uploadImages);

module.exports = router;
