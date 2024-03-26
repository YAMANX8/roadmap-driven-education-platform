const router = require('express').Router();
const pool = require('../../../database/db');
const authorization = require('../../../middleware/authorization');
const uploadVideo = require('../../../lib/multer-video');

// Get TL1 And TLN .
// Items For Specific Insturctor And Course .
router.get('/show_items/:course_id', authorization, async (req, res) => {
  try {
    const { tl1_id } = req.body;
    const instructorId = req.user.userId;
    const course_id = req.params.course_id;
    // show items with topic_level_n and topic_level_1
    const show_items = `
      SELECT
        Topic_Level_1.topic_level1_id,
        Topic_Level_1.topic_title,
        Topic_Level_N.topic_id,
        Topic_Level_N.topic_title,
        Items.item_id,
        Items.item_title,
        Items.item_no,
        Items.item_type
      FROM
        course
        LEFT join items ON course.course_id = items.course_id
        LEFT JOIN Topic_Level_N ON Items.topic_id = Topic_Level_N.topic_id
        LEFT JOIN Topic_Level_1 ON Topic_Level_N.topic_level1_id = Topic_Level_1.topic_level1_id
      where
        items.course_id = $1
        And course.instructor_id = $2;
    `;
    const Values_show_items = [course_id, instructorId];
    const result_show_items = await pool.query(show_items, Values_show_items);

    //  Assigning_Topics for instructor **
    const show_tl1 = `
      SELECT
        Assigning_Topics.instructor_id,
        Topic_Level_1.topic_title
      FROM
        Assigning_Topics
        JOIN Topic_Level_1 ON assigning_topics.topic_level1_id = Topic_Level_1.topic_level1_id
      WHERE
        instructor_id = 1;
    `;
    const Values_show_tl1 = [instructorId];
    // result_show_tl1 **
    await pool.query(show_tl1, Values_show_tl1);

    // select topic_level_n
    const show_tln = `
      SELECT
        Topic_Level_1.topic_level1_id,
        Topic_Level_1.topic_title,
        Topic_Level_N.topic_id,
        Topic_Level_N.topic_title
      FROM
        Topic_Level_1
        join Topic_Level_n ON Topic_Level_1.topic_level1_id = Topic_Level_N.topic_level1_id
      where
        Topic_Level_1.topic_level1_id = $1;
    `;
    const values_show_tln = [tl1_id];
    // result_show_tln **
    await pool.query(show_tln, values_show_tln);

    // Process the course content data
    const courseContent = [];

    const usedTopicIds = new Map();

    result_show_items.rows.forEach((row) => {
      const topicId = row.topic_level1_id;
      const subTopicId = row.topic_id;

      if (!usedTopicIds.has(topicId)) {
        usedTopicIds.set(topicId, courseContent.length);
        courseContent.push({
          id: topicId,
          topicTitle: row.topic_title, // Adjusted to match the column name
          subTopics: [],
        });
      }

      const topicIndex = usedTopicIds.get(topicId);
      const currentTopic = courseContent[topicIndex];

      if (
        !currentTopic.subTopics.find((subTopic) => subTopic.id === subTopicId)
      ) {
        currentTopic.subTopics.push({
          id: subTopicId,
          title: row.topic_title, // Adjusted to match the column name
          items: [],
        });
      }

      const subTopicIndex = currentTopic.subTopics.findIndex(
        (subTopic) => subTopic.id === subTopicId,
      );
      const currentSubTopic = currentTopic.subTopics[subTopicIndex];

      currentSubTopic.items.push({
        id: row.item_id,
        title: row.item_title,
        order: row.item_no,
        type: row.item_type,
      });
    });

    res.json(courseContent);
  } catch (error) {
    console.error(error.message);
    res.status(500).send('Server Error');
  }
});

// Post A New Item
router.post(
  '/insert_item',
  authorization,
  uploadVideo.single('video'),
  async (req, res) => {
    try {
      const {
        item_title,
        item_description,
        item_no,
        course_id,
        topic_id,
        item_type,
        content_type,
      } = req.body;

      const query = `
        INSERT INTO
          items (
            item_title,
            item_description,
            item_no,
            course_id,
            topic_id,
            item_type
          )
        VALUES
          ($1, $2, $3, $4, $5, $6)
        RETURNING
          item_id;
      `;

      const values = [
        item_title,
        item_description,
        item_no,
        course_id,
        topic_id,
        item_type,
      ];

      const result = await pool.query(query, values);
      const my_item_id = result.rows[0].item_id;

      console.log(item_type);

      if (item_type == 2) {
        if (!req.file) {
          // إذا لم يتم تحميل أي ملف
          res.status(400).json({ error: 'No video file uploaded.' });
          return;
        }
        let video_path = null;
        video_path = encodeURIComponent(req.file.path);
        console.log(video_path);
        const videoQuery = `
          INSERT INTO
            video (video_path, item_id)
          VALUES
            ($1, $2);
        `;
        const videoValues = [video_path, my_item_id];
        await pool.query(videoQuery, videoValues);
      } else {
        const articleQuery = `
          INSERT INTO
            article (article_body, item_id)
          VALUES
            ($1, $2);
        `;
        const articleValues = [content_type, my_item_id];
        await pool.query(articleQuery, articleValues);
      }
      res.json('Item has been inserted.');
    } catch (err) {
      console.error(err);
      res.status(500).send('Server Error');
    }
  },
);

module.exports = router;
