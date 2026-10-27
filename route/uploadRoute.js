import express from 'express';
import upload from '../utils/uploadMiddleware.js';
import cloudinary from '../Config/cloudinary.js';

const router = express.Router();

// Upload image or video to Cloudinary
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ status: 0, message: 'No file uploaded' });
    }

    // Determine resource type: image vs video
    const isVideo = req.file.mimetype.startsWith('video');
    const resourceType = isVideo ? 'video' : 'image';

    const uploadStream = () => {
      return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            folder: 'learnhub_courses',
            resource_type: resourceType
          },
          (error, result) => {
            if (error) return reject(error);
            resolve(result);
          }
        );
        stream.end(req.file.buffer);
      });
    };

    const result = await uploadStream();

    return res.status(200).json({
      status: 1,
      message: 'File uploaded to Cloudinary successfully!',
      url: result.secure_url,
      public_id: result.public_id,
      format: result.format,
      resource_type: result.resource_type
    });
  } catch (error) {
    console.error('Cloudinary Upload Error:', error);
    return res.status(500).json({
      status: 0,
      message: 'Cloudinary upload failed',
      errorMessage: error.message
    });
  }
});

export default router;