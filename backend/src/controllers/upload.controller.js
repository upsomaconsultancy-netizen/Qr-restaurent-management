const { uploadImage, deleteImage } = require('../config/cloudinary');
const ApiError = require('../utils/ApiError');

const FOLDERS = ['menu', 'category', 'logo'];

exports.uploadImage = async (req, res) => {
  if (!req.file) throw ApiError.badRequest('No image file was uploaded. Please select an image and try again.');
  const folder = req.body.folder;
  if (!FOLDERS.includes(folder)) throw ApiError.badRequest('Invalid folder. Must be one of: menu, category, logo.');

  let result;
  try {
    result = await uploadImage(req.file.buffer, `ros/${req.user.restaurantId}/${folder}`);
  } catch (err) {
    console.error('[uploadImage] Cloudinary error:', err?.message || err);
    throw new ApiError(500, 'Image upload failed. Please check your internet connection and try again.');
  }

  res.status(201).json({ success: true, data: { secure_url: result.secure_url, public_id: result.public_id } });
};

exports.deleteImage = async (req, res) => {
  const { publicId } = req.body;
  if (!publicId) throw ApiError.badRequest('publicId is required.');
  await deleteImage(publicId).catch(() => {});
  res.json({ success: true });
};
