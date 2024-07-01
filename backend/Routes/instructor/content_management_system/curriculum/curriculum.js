const router = require('express').Router();
const pool = require('../../../../database/db');
const authorization = require('../../../../middleware/authorization');
const checkPermission = require('../../../../middleware/check-permissions');
const fs = require('fs');
const { getVideoDurationInSeconds } = require('get-video-duration');
const uploadVideo = require('../../../../lib/multer-video');

// get Assigning_Topics just TL1
router.get('/curriculum/assigning-topics', authorization, async (req, res) => {
  try {
    const instructorId = req.user.userId;
    const roleId = req.user.roleId;
    // permission
    const hasAccess = await checkPermission(
      instructorId,
      'instructor_content_management',
      roleId,
    );
    if (!hasAccess) {
      return res.status(403).json('Access denied');
    }

    // array of objects
    const getInfoAboutAssigningTopics = `
    SELECT
        AT.topic_level1_id,
        TL1.topic_title
    FROM
        Assigning_Topics AT
    JOIN Topic_Level_1 TL1 ON AT.topic_level1_id = TL1.topic_level1_id
    WHERE
        AT.instructor_id = $1
    `;
    const getInfoAboutAssigningTopicsValue = [instructorId];
    const result = await pool.query(
      getInfoAboutAssigningTopics,
      getInfoAboutAssigningTopicsValue,
    );
    // respone
    res.status(200).json(result.rows);
  } catch (err) {
    console.error('Error retrieving Assigning Topics information:', err);
    res.status(500).json({ error: 'Server Error' });
  }
});

// get info about TL1 name ,items info :Here we want to display only the topics in which the item was created
router.get('/curriculum/:courseId', authorization, async (req, res) => {
  try {
    const instructorId = req.user.userId;
    const roleId = req.user.roleId;
    const courseId = req.params.courseId;

    // Permission check
    const hasAccess = await checkPermission(
      instructorId,
      'instructor_content_management',
      roleId,
    );
    if (!hasAccess) {
      return res.status(403).json('Access denied');
    }

    // Query to get course title
    const courseTitleQuery = `
      SELECT course_title
      FROM course
      WHERE course_id = $1;
    `;
    const courseTitleResult = await pool.query(courseTitleQuery, [courseId]);

    if (courseTitleResult.rows.length === 0) {
      return res.status(404).json('Course not found');
    }

    const courseTitle = courseTitleResult.rows[0].course_title;

    // Query to get curriculum details
    const getInfoForCurriculumPage = `
WITH RECURSIVE TopicHierarchy AS (
  SELECT
    T.topic_id,
    T.topic_title,
    T.top_level_topic_id,
    T.topic_level1_id,
    ARRAY[T.topic_title]::text[] AS topics_sequence
  FROM
    topic_level_n T
  WHERE
    T.topic_id IN (
      SELECT DISTINCT
        I.topic_id
      FROM
        items I
      JOIN course C ON I.course_id = C.course_id
      WHERE
        C.course_id = $1
    )
  UNION ALL
  SELECT
    T.topic_id,
    T.topic_title,
    T.top_level_topic_id,
    T.topic_level1_id,
    TH.topics_sequence || T.topic_title
  FROM
    topic_level_n T
  JOIN TopicHierarchy TH ON T.topic_id = TH.top_level_topic_id
),
FinalTopics AS (
  SELECT
    TH.topic_id,
    array_to_string(MAX(TH.topics_sequence), ' > ') AS topics_sequence,
    COALESCE(TH.topic_level1_id, TL1.topic_level1_id) AS topic_level1_id
  FROM
    TopicHierarchy TH
  LEFT JOIN topic_level_n TL1 ON TH.top_level_topic_id = TL1.topic_id
  GROUP BY
    TH.topic_id, TH.topic_level1_id, TL1.topic_level1_id
),
ItemDetails AS (
  SELECT
    I.item_id,
    I.item_title,
    I.item_no,
    CASE I.item_type
      WHEN 1 THEN 'article'
      WHEN 2 THEN 'video'
      WHEN 3 THEN 'quiz'
    END AS item_type,
    I.topic_id,
    I.course_id
  FROM
    items I
  WHERE
    I.course_id = $1
)
SELECT
  ID.item_id,
  ID.item_title,
  ID.item_no,
  ID.item_type,
  FT.topics_sequence,
  FT.topic_level1_id,
  TL1.topic_title AS topic_level1_name
FROM
  ItemDetails ID
JOIN
  FinalTopics FT ON ID.topic_id = FT.topic_id
LEFT JOIN
  topic_level_1 TL1 ON FT.topic_level1_id = TL1.topic_level1_id
ORDER BY
  ID.item_id;
    `;
    const result = await pool.query(getInfoForCurriculumPage, [courseId]);

    // Transform the results into the desired JSON structure
    const transformedData = result.rows.reduce((acc, row) => {
      const { topic_level1_id, topic_level1_name, ...lesson } = row;

      const topic = acc.find((t) => t.topic_level1_id === topic_level1_id);
      if (topic) {
        topic.lessons.push(lesson);
      } else {
        acc.push({
          topic_level1_id,
          parent_topic_title: topic_level1_name,
          lessons: [lesson],
        });
      }

      return acc;
    }, []);

    // Add the course title to the transformed data
    const responseData = {
      course_title: courseTitle,
      topics: transformedData,
    };

    res.status(200).json(responseData);
  } catch (err) {
    console.error('Error retrieving curriculum information:', err);
    res.status(500).json({ error: 'Server Error' });
  }
});

// get video data by item Id
router.get('/curriculum/video/:itemId', authorization, async (req, res) => {
  try {
    const instructorId = req.user.userId;
    const roleId = req.user.roleId;
    const itemId = req.params.itemId;
    // permission
    const hasAccess = await checkPermission(
      instructorId,
      'instructor_content_management',
      roleId,
    );
    if (!hasAccess) {
      return res.status(403).json('Access denied');
    }

    const getInfoAboutVideo = `
        SELECT * FROM video WHERE item_id = $1;
    `;
    const getInfoAboutVideoValue = [itemId];
    const result = await pool.query(getInfoAboutVideo, getInfoAboutVideoValue);
    // Decode the video path and replace backslashes with forward slashes
    const response = result.rows.map((row) => {
      const decodedPath = decodeURIComponent(row.video_path).replace(
        /\\/g,
        '/',
      );
      return {
        id: row.video_id,
        upload_date: row.upload_date,
        item_id: row.item_id,
        video_duration: row.video_duration,
        video_path: `http://localhost:5000/video/${decodedPath}`,
      };
    });

    res.status(200).json(response);
  } catch (err) {
    console.error('Error retrieving video information:', err);
    res.status(500).json({ error: 'Server Error' });
  }
});

// get article by item Id
router.get('/curriculum/article/:item_id', authorization, async (req, res) => {
  try {
    const instructorId = req.user.userId;
    const roleId = req.user.roleId;
    const itemId = req.params.item_id;
    // permission
    const hasAccess = await checkPermission(
      instructorId,
      'instructor_content_management',
      roleId,
    );
    if (!hasAccess) {
      return res.status(403).json('Access denied');
    }

    const getInfoAboutArticle = `
    SELECT
        a.article_id,
        a.article_body,
        a.item_id
    FROM
        items i
    JOIN article a ON i.item_id = a.item_id
    WHERE
        i.item_id = 40;
    `;
    const getInfoAboutArticleValue = [itemId];
    const result = await pool.query(
      getInfoAboutArticle,
      getInfoAboutArticleValue,
    );
    // respone
    res.status(200).json(result.rows);
  } catch (err) {
    console.error('Error retrieving article information:', err);
    res.status(500).json({ error: 'Server Error' });
  }
});

// get questions by item Id
router.get(
  '/curriculum/questions/:item_id',
  authorization,
  async (req, res) => {
    try {
      const instructorId = req.user.userId;
      const roleId = req.user.roleId;
      const itemId = req.params.item_id;
      // permission
      const hasAccess = await checkPermission(
        instructorId,
        'instructor_content_management',
        roleId,
      );
      if (!hasAccess) {
        return res.status(403).json('Access denied');
      }

      const getInfoAboutQuestions = `
    SELECT
        question.question_id,
        question.question_body,
        question.question_no,
        question.question_points,
        question.quiz_id
    FROM
        items i
    JOIN quiz q ON i.item_id = q.item_id
    LEFT JOIN question ON q.quiz_id = question.quiz_id
    WHERE
        i.item_id = $1;
    `;
      const getInfoAboutQuestionValue = [itemId];
      const result = await pool.query(
        getInfoAboutQuestions,
        getInfoAboutQuestionValue,
      );
      const quizId = result.rows.length > 0 ? result.rows[0].quiz_id : null;
      // respone
      res.status(200).json({
        quiz_id: quizId,
        questions: result.rows,
      });
    } catch (err) {
      console.error('Error retrieving questions information:', err);
      res.status(500).json({ error: 'Server Error' });
    }
  },
);

// get options && questoin data by question ID
router.get(
  '/curriculum/options/:questionId',
  authorization,
  async (req, res) => {
    try {
      const instructorId = req.user.userId;
      const roleId = req.user.roleId;
      const questionId = req.params.questionId;

      // permission
      const hasAccess = await checkPermission(
        instructorId,
        'instructor_content_management',
        roleId,
      );
      if (!hasAccess) {
        return res.status(403).json('Access denied');
      }

      // Query to get question and options
      const getInfoAboutOptionsAndQuestion = `
      SELECT q.question_id, q.question_body, q.question_no, q.question_points, 
             o.option_id, o.option_body, o.is_correct, o.option_no
      FROM question q
      LEFT JOIN option o ON q.question_id = o.question_id
      WHERE q.question_id = $1;
    `;
      const getInfoAboutOptionsAndQuestionValue = [questionId];
      const result = await pool.query(
        getInfoAboutOptionsAndQuestion,
        getInfoAboutOptionsAndQuestionValue,
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Question not found' });
      }

      // Prepare response
      const question = {
        question_id: result.rows[0].question_id,
        question_body: result.rows[0].question_body,
        question_no: result.rows[0].question_no,
        question_points: result.rows[0].question_points,
        options: result.rows.map((row) => ({
          option_id: row.option_id,
          option_body: row.option_body,
          is_correct: row.is_correct,
          option_no: row.option_no,
        })),
      };

      // Respond with question and options
      res.status(200).json(question);
    } catch (err) {
      console.error('Error retrieving options and question information:', err);
      res.status(500).json({ error: 'Server Error' });
    }
  },
);


// insert
// new question
router.post('/curriculum/question/:quizId', authorization, async (req, res) => {
  try {
    const instructorId = req.user.userId;
    const roleId = req.user.roleId;
    const { question_body, question_no, question_points, options } = req.body;
    const quizId = req.params.quizId;
    // permission
    const hasAccess = await checkPermission(
      instructorId,
      'instructor_content_management',
      roleId,
    );
    if (!hasAccess) {
      return res.status(403).json('Access denied');
    }

    const addNewQuestion = `
    INSERT INTO question (question_body,question_no,question_points,quiz_id)
      VALUES
      ($1,$2,$3,$4)
       RETURNING
       question_id
    `;
    const addNewQuestionValue = [
      question_body,
      question_no,
      question_points,
      quizId,
    ];
    const questionResult = await pool.query(
      addNewQuestion,
      addNewQuestionValue,
    );
    const questionId = questionResult.rows[0].question_id;
    // add options
    if (options && options.length > 0) {
      for (const option of options) {
        const addNewOptionQuery = `
      INSERT INTO option (option_body, is_correct, option_no, question_id)
      VALUES ($1, $2, $3 ,$4) 
    `;
        const addNewOptionValues = [
          option.option_body,
          option.is_correct,
          option.option_no,
          questionId,
        ];

        await pool.query(addNewOptionQuery, addNewOptionValues);
      }
    }
    res
      .status(200)
      .json({ message: 'Question and options added successfully' });
    // respone
  } catch (err) {
    console.error('Error adding options and question information:', err);
    res.status(500).json({ error: 'Server Error' });
  }
});

// new items
// get topic_level_2 by TL1 id
router.get(
  '/curriculum/new-item/TL2/:topicId',
  authorization,
  async (req, res) => {
    try {
      const instructorId = req.user.userId;
      const roleId = req.user.roleId;
      const topicId = req.params.topicId;
      // permission
      const hasAccess = await checkPermission(
        instructorId,
        'instructor_content_management',
        roleId,
      );
      if (!hasAccess) {
        return res.status(403).json('Access denied');
      }

      const getInfoAboutTopicLevel2 = `
    SELECT
        TLN.topic_id,
        TLN.topic_title
    FROM
        topic_level_n TLN
    WHERE
        TLN.topic_level1_id = $1 AND topic_level=2
    `;
      const getInfoAboutTopicLevel2Value = [topicId];
      const result = await pool.query(
        getInfoAboutTopicLevel2,
        getInfoAboutTopicLevel2Value,
      );
      // respone
      res.status(200).json(result.rows);
    } catch (err) {
      console.error('Error retrieving Topic Level Two information:', err);
      res.status(500).json({ error: 'Server Error' });
    }
  },
);

// get topic_level_3 by Tl2 id
router.get(
  '/curriculum/new-item/TL3/:topicId',
  authorization,
  async (req, res) => {
    try {
      const instructorId = req.user.userId;
      const roleId = req.user.roleId;
      const topicId = req.params.topicId;
      // permission
      const hasAccess = await checkPermission(
        instructorId,
        'instructor_content_management',
        roleId,
      );
      if (!hasAccess) {
        return res.status(403).json('Access denied');
      }

      const getInfoAboutTopicLevel2 = `
    SELECT
        TLN.topic_id,
        TLN.topic_title
    FROM
        topic_level_n TLN
    WHERE
        TLN.top_level_topic_id = $1 AND topic_level=3
    `;
      const getInfoAboutTopicLevel2Value = [topicId];
      const result = await pool.query(
        getInfoAboutTopicLevel2,
        getInfoAboutTopicLevel2Value,
      );
      // respone
      res.status(200).json(result.rows);
    } catch (err) {
      console.error('Error retrieving Topic Level Two information:', err);
      res.status(500).json({ error: 'Server Error' });
    }
  },
);

// post api save [tl2,tl3]  the last item in the array
router.post(
  '/curriculum/new-item/:courseId',
  authorization,
  async (req, res) => {
    try {
      const instructorId = req.user.userId;
      const roleId = req.user.roleId;
      const courseId = req.params.courseId;
      // item_type =>  1 article | 2 video | 3 quiz
      const { itemTitle, topics, item_type } = req.body; // topics are array of topicsID
      // permission
      const hasAccess = await checkPermission(
        instructorId,
        'instructor_content_management',
        roleId,
      );
      if (!hasAccess) {
        return res.status(403).json('Access denied');
      }
      // Get the last topic_id from the topics array
      const lastTopicId = topics[topics.length - 1];

      // Get the maximum item_no for the course and add 1
      const getMaxItemNoQuery = `
      SELECT COALESCE(MAX(item_no), 0) + 1 AS new_item_no
      FROM items
      WHERE course_id = $1
    `;
      const { rows } = await pool.query(getMaxItemNoQuery, [courseId]);
      const newItemNo = rows[0].new_item_no;
      // Add the new item with the calculated item_no and the last topic_id
      const addNewItemQuery = `
      INSERT INTO items (item_title, item_no, course_id, topic_id, item_type)
      VALUES ($1, $2, $3, $4, $5)
    `;
      const addNewItemValues = [
        itemTitle,
        newItemNo,
        courseId,
        lastTopicId,
        item_type,
      ];
      await pool.query(addNewItemQuery, addNewItemValues);

      res.status(200).json({ message: 'Item is added successfully' });
      // respone
    } catch (err) {
      console.error('Error adding Item information:', err);
      res.status(500).json({ error: 'Server Error' });
    }
  },
);

// **** ?? delete in enroll to the course
// delete item note when the course is published(enroll on the course) >> Items must not be allowed to be deleted
router.delete('/curriculum/item/:itemId', authorization, async (req, res) => {
  try {
    const instructorId = req.user.userId;
    const roleId = req.user.roleId;
    const itemId = req.params.itemId;
    // permission
    const hasAccess = await checkPermission(
      instructorId,
      'instructor_content_management',
      roleId,
    );
    if (!hasAccess) {
      return res.status(403).json('Access denied');
    }

    // Get item type
    const itemInfoQuery = `
     SELECT * FROM items WHERE item_id = $1;
     `;
    const itemTypeValue = [itemId];
    const itemResult = await pool.query(itemInfoQuery, itemTypeValue);
    const type = itemResult.rows[0].item_type;
    const courseId = itemResult.rows[0].course_id;
    // check enroll to the course || Completed_Items
    const checkEnrollmentQuery = `
    SELECT * FROM enrollment WHERE course_id = $1
    `;
    const checkEnrollmentResult = await pool.query(checkEnrollmentQuery, [
      courseId,
    ]);
    console.log(checkEnrollmentResult.rows);
    if (checkEnrollmentResult.rows.length === 0) {
      // Delete related data first based on item type
      let deleteRelatedQuery;
      switch (type) {
        case 1:
          deleteRelatedQuery = `DELETE FROM article WHERE item_id=$1`;
          break;
        case 2:
          deleteRelatedQuery = `DELETE FROM video WHERE item_id=$1`;
          break;
        case 3:
          await pool.query(
            `
          DELETE FROM option WHERE question_id IN 
          (SELECT question_id FROM question WHERE quiz_id IN 
          (SELECT quiz_id FROM quiz WHERE item_id=$1));
        `,
            [itemId],
          );
          await pool.query(
            `
          DELETE FROM question WHERE quiz_id IN 
          (SELECT quiz_id FROM quiz WHERE item_id=$1);
        `,
            [itemId],
          );
          await pool.query(
            `
          DELETE FROM quiz WHERE item_id=$1;
        `,
            [itemId],
          );
          break;
        default:
          break;
      }

      // Delete related data
      if (deleteRelatedQuery) {
        await pool.query(deleteRelatedQuery, [itemId]);
      }

      // Delete item from items table
      const deleteItemQuery = `DELETE FROM items WHERE item_id=$1`;
      await pool.query(deleteItemQuery, [itemId]);

      // Response
      res.status(202).json({ message: 'item deleted successfully' });
    } else {
      // enrollment
      res.status(403).json({
        message: `You can't delete the item Because the course has already been enrolled `,
      });
    }
  } catch (err) {
    console.error('Error deleting item :', err);
    res.status(500).json({ error: 'Server Error' });
  }
});

// delete one question || check enroll in the course?
router.delete(
  '/curriculum/question/:questionId',
  authorization,
  async (req, res) => {
    try {
      const instructorId = req.user.userId;
      const roleId = req.user.roleId;
      const questionId = req.params.questionId;
      // permission
      const hasAccess = await checkPermission(
        instructorId,
        'instructor_content_management',
        roleId,
      );
      if (!hasAccess) {
        return res.status(403).json('Access denied');
      }

      const deleteOption = `
        DELETE FROM option WHERE question_id = $1
       `;
      await pool.query(deleteOption, [questionId]);
      const deleteQuestion = `
        DELETE FROM question WHERE question_id = $1;
       `;
      const deleteQuestionValue = [questionId];
      await pool.query(deleteQuestion, deleteQuestionValue);
      // respone
      res.status(202).json({ message: 'question deleted successfully' });
    } catch (err) {
      console.error('Error deleting question :', err);
      res.status(500).json({ error: 'Server Error' });
    }
  },
);

// update
// update video
router.put(
  '/curriculum/video/:itemId',
  authorization,
  uploadVideo.single('video'),
  async (req, res) => {
    try {
      const itemId = req.params.itemId;
      const videoFilePath = req.file.path;
      // get video duration
      const videoDuration = await getVideoDurationInSeconds(videoFilePath);
      const videoDurationInMinutes = Math.ceil(videoDuration / 60);
      // Delete old video from the Upload/Video folder
      const oldVideoPathQuery = `
        SELECT video_path FROM video WHERE item_id = $1
      `;
      const oldVideoPathValues = [itemId];
      const oldVideoResult = await pool.query(
        oldVideoPathQuery,
        oldVideoPathValues,
      );

      if (oldVideoResult.rows.length > 0) {
        const oldVideoPath = decodeURIComponent(
          oldVideoResult.rows[0].video_path,
        );
        if (fs.existsSync(oldVideoPath)) {
          // delete file if exist
          fs.unlinkSync(oldVideoPath);
        }
        const videoFileName = req.file.filename;
        // Update video data in the database
        const updateVideoQuery = `
        UPDATE video
        SET video_path = $1, video_duration = $2
        WHERE item_id = $3
       `;
        const encodeFielPath = encodeURIComponent(videoFileName);
        const updateVideoValues = [
          encodeFielPath,
          videoDurationInMinutes,
          itemId,
        ];
        await pool.query(updateVideoQuery, updateVideoValues);
        res.status(200).json({ message: 'Video updated successfully' });
      } else {
        const videoFileName = req.file.filename;
        // insert video data in the database
        const insertVideoQuery = `
        INSERT INTO video (video_path,item_id,video_duration,upload_date)
        VALUES
        ($1,$2,$3,$4);
       `;
        const encodeFielPath = encodeURIComponent(videoFileName);
        const upload_date = new Date().toISOString().split('T')[0];
        const insertVideoValues = [
          encodeFielPath,
          itemId,
          videoDurationInMinutes,
          upload_date,
        ];
        await pool.query(insertVideoQuery, insertVideoValues);
        res.status(200).json({ message: 'Video inserted successfully' });
      }
    } catch (err) {
      console.error('Error when updating or inserting video:', err);
      res.status(500).json({ error: 'Server Error' });
    }
  },
);

// udate question with options
router.put(
  '/curriculum/question/:questionId',
  authorization,
  async (req, res) => {
    try {
      const instructorId = req.user.userId;
      const roleId = req.user.roleId;
      const questionId = req.params.questionId;
      const { question_body, options, question_points } = req.body;
      // permission
      const hasAccess = await checkPermission(
        instructorId,
        'instructor_content_management',
        roleId,
      );
      if (!hasAccess) {
        return res.status(403).json('Access denied');
      }

      const updateQuestion = `
        UPDATE question
        SET question_body = $1 , question_points = $2
        WHERE question_id = $3
    `;
      const updateQuestionValue = [question_body, question_points, questionId];

      // add options // check of option_no
      if (options && options.length > 0) {
        for (const option of options) {
          const updateOptionQuery = `
          UPDATE option
            SET 
              option_body = $1,
              is_correct = $2,
              option_no = $3
            WHERE
              option_id = $4
    `;
          const updateOptionValues = [
            option.option_body,
            option.is_correct,
            option.option_no,
          ];

          await pool.query(updateOptionQuery, updateOptionValues);
        }
      }
      if (question_body && questionId) {
        await pool.query(updateQuestion, updateQuestionValue);
      }
      // respone
      res
        .status(200)
        .json({ message: 'question and options updated successfully' });
    } catch (err) {
      console.error('Error updating options and question information:', err);
      res.status(500).json({ error: 'Server Error' });
    }
  },
);

// update article
router.put('/curriculum/article/:itemId', authorization, async (req, res) => {
  try {
    const instructorId = req.user.userId;
    const roleId = req.user.roleId;
    const itemId = req.params.itemId;
    const { article_body } = req.body;
    // permission
    const hasAccess = await checkPermission(
      instructorId,
      'instructor_content_management',
      roleId,
    );
    if (!hasAccess) {
      return res.status(403).json('Access denied');
    }

    const updateArticle = `
        UPDATE article
        SET article_body = $1
        WHERE item_id = $2
    `;
    const updateArticelValue = [article_body, itemId];

    if (article_body && itemId) {
      await pool.query(updateArticle, updateArticelValue);
    }
    // respone
    res.status(200).json({ message: 'article updated successfully' });
  } catch (err) {
    console.error('Error updating articel information:', err);
    res.status(500).json({ error: 'Server Error' });
  }
});

module.exports = router;
