const router = require('express').Router();
const pool = require('../../database/db');
const authorization = require('../../middleware/authorization');
const checkPermission = require('../../middleware/check-permissions');
const Completed_Items_import = require('../../Utils/course/completed');

router.get('/:courseId/:itemId', authorization, async (req, res) => {
  try {
    const studentId = req.user.userId;
    const roleId = req.user.roleId;
    const courseId = req.params.courseId;
    const itemId = req.params.itemId;
    // permission
    const hasAccess = await checkPermission(studentId, 'show_article', roleId);
    if (!hasAccess) {
      return res.status(403).json('Access denied');
    }

    const enrollmentQuery = `
      SELECT
        enrollment_id
      FROM
        enrollment
      WHERE
        student_id = $1
        AND course_id = $2;
    `;
    const enrollmentValues = [studentId, courseId];
    const enrollmentResult = await pool.query(
      enrollmentQuery,
      enrollmentValues,
    );
    if (
      enrollmentResult &&
      enrollmentResult.rows &&
      enrollmentResult.rows.length > 0
    ) {
      const enrollId = enrollmentResult.rows[0].enrollment_id;

      const checkEnrollmentQuery = `
        SELECT
          course_id,
          enrollment_id
        FROM
          enrollment
        WHERE
          course_id = $1
          AND enrollment_id = $2
      `;
      const checkEnrollmentQueryValues = [courseId, enrollId];
      const { rows } = await pool.query(
        checkEnrollmentQuery,
        checkEnrollmentQueryValues,
      );
      if (rows.length !== 0) {
        const query1 = `
          SELECT
            Topic_Level_1.topic_level1_id,
            Topic_Level_1.topic_title AS topicTitle1,
            Topic_Level_n.topic_id,
            Topic_Level_n.topic_title AS topicTitlen,
            Items.item_id,
            Items.item_title,
            Items.item_description,
            Items.item_no,
            Items_Types.type_name,
            CASE
              WHEN c.item_id IS NOT NULL THEN TRUE
              ELSE FALSE
            END AS is_completed,
            CASE
              WHEN EXISTS (
                SELECT
                  1
                FROM
                  Enrollment e
                WHERE
                  e.student_id = $1
                  AND e.course_id = $2
              ) THEN TRUE
              ELSE FALSE
            END AS is_enroll
          FROM
            course
            JOIN items ON course.course_id = items.course_id
            JOIN Items_Types ON Items.item_type = Items_Types.type_id
            LEFT JOIN Completed_Items ON Items.item_id = Completed_Items.item_id
            JOIN Topic_Level_N ON items.topic_id = Topic_Level_N.topic_id
            JOIN Topic_Level_1 ON Topic_Level_N.topic_level1_id = Topic_Level_1.topic_level1_id
            LEFT JOIN (
              SELECT
                item_id,
                enrollment_id
              FROM
                Completed_Items
              WHERE
                enrollment_id = $3
            ) c ON Items.item_id = c.item_id
          WHERE
            course.course_id = $2
        `;

        const query2 = `
          SELECT
            items.item_title,
            Article.article_body
          FROM
            items
            join Article ON items.item_id = Article.item_id
          WHERE
            items.item_id = $1
        `;
        const values1 = [studentId, courseId, enrollId];
        const values2 = [itemId];
        const result1 = await pool.query(query1, values1);
        const result2 = await pool.query(query2, values2);
        const article_body = result2.rows[0].article_body;

        // Process the course content data
        const courseContent = [];

        // Set لتتبع العناصر التي تم استخدامها بالفعل بناءً على topic_id
        const usedTopicIds = new Set();

        result1.rows.forEach((row) => {
          const topicId = row.topic_level1_id;
          const subTopicId = row.topic_id;

          // التحقق مما إذا كان topic_id تم استخدامه بالفعل
          if (!usedTopicIds.has(topicId)) {
            courseContent.push({
              id: topicId,
              topicTitle: row.topictitle1,
              subTopics: [],
            });
            // إضافة topic_id إلى مجموعة العناصر المستخدمة بالفعل
            usedTopicIds.add(topicId);
          }

          // البحث عن الموضوع الحالي في courseContent
          const currentTopic = courseContent.find(
            (topic) => topic.id === topicId,
          );

          // التحقق مما إذا كان subTopicId تم استخدامه بالفعل
          if (
            !currentTopic.subTopics.find(
              (subTopic) => subTopic.id === subTopicId,
            )
          ) {
            currentTopic.subTopics.push({
              id: subTopicId,
              title: row.topictitlen,
              items: [],
            });
          }

          // البحث عن الموضوع الفرعي الحالي في subTopics
          const currentSubTopic = currentTopic.subTopics.find(
            (subTopic) => subTopic.id === subTopicId,
          );

          currentSubTopic.items.push({
            id: row.item_id,
            title: row.item_title,
            description: row.item_description,
            order: row.item_no,
            type: row.type_name,
            is_completed: row.is_completed,
          });
        });

        const response = {
          article: article_body,
          courseContent: courseContent,
        };
        res.status(200).json({
          is_enrolled: result1.rows[0].is_enroll,
          response,
        });
      }
    } else {
      return res.status(401).json({ message: 'Not enrolled in the course' });
    }
  } catch (err) {
    console.error('Error retrieving course information:', err);
    res.status(500).json({ error: 'Server Error' });
  }
});

// complete item
router.post('/Completed', authorization, async (req, res) => {
  try {
    const Id = req.user.userId;
    const { itemId } = req.body;
    const itemCompleted = await Completed_Items_import.completed_items(
      itemId,
      Id,
    );
    if (itemCompleted) {
      res.json('You have already completed this item.');
    } else {
      res.json('The item has been added.');
    }
  } catch (err) {
    console.error('Error insert item information', err);
    res.status(500).json({ error: 'Server Error' });
  }
});

module.exports = router;
