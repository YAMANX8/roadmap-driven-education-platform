const router = require('express').Router();
const pool = require('../../database/db');
const uploadImage = require('../../lib/multer-image');

router.post('/', uploadImage.single('image'), async (req, res) => {
  try {
    const { title, description } = req.body;
    const imageFilePath = encodeURIComponent(req.file.filename);

    const newRodmapInfo = await pool.query(
      // eslint-disable-next-line no-undef
      `
        INSERT INTO
          roadmap (roadmap_title, roadmap_description, image_path)
        VALUES
          ($1, $2, $3)
        RETURNING
          *
      `,
      [title, description, imageFilePath],
    );

    const newRoadmapInfo = {
      roadmap_id: newRodmapInfo.rows[0].roadmap_id,
      roadmap_title: newRodmapInfo.rows[0].roadmap_title,
      roadmap_description: newRodmapInfo.rows[0].roadmap_description,
      image_path: `http://localhost:5000/image/${newRodmapInfo.rows[0].image_path}`,
    };

    res.status(200).json({ status: 'success', data: newRoadmapInfo });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: 'error', message: 'An error occurred' });
  }
});

module.exports = router;
