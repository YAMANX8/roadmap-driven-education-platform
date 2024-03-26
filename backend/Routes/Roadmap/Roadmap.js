const router = require('express').Router();
const pool = require('../../database/db');
const jwt = require('jsonwebtoken');
const checkPermission = require('../../middleware/check-permissions');

// Get all roadmaps
router.get('/', async (req, res) => {
  try {
    const queryResult = await pool.query('SELECT * FROM Roadmap');
    const decodedData = queryResult.rows.map((row) => {
      const decodedImagePath = decodeURIComponent(row.image_path);
      return {
        ...row,
        image_path: `http://localhost:5000/image/${decodedImagePath}`,
      };
    });

    res.status(200).json({
      status: 'success',
      result: queryResult.rows.length,
      data: {
        dataresult: decodedData,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      status: 'error',
      message: 'An error occurred',
    });
  }
});

//* Returns topics with login by roadmapID
router.get('/student/:id', async (req, res) => {
  try {
    const roadmapId = req.params.id;
    const jwtToken = req.header('token');
    // eslint-disable-next-line no-undef
    const payload = jwt.verify(jwtToken, process.env.jwtSecret);
    const role_id = payload.roleId;
    console.log(role_id);
    if (!jwtToken || role_id === 1) {
      // If there is no valid authentication (student is not authenticated)
      // Redirect the request to another API endpoint
      return res.redirect(
        `http://localhost:5000/AcademicCompass/roadmap/${roadmapId}`,
      );
    } else {
      // Extract student ID from the token and proceed with your logic
      const studentId = payload.userId;
      console.log(studentId);
      //permission
      const hasAccess = await checkPermission(
        studentId,
        'show_roadmap',
        role_id,
      );
      if (!hasAccess) {
        return res.status(403).json('Access denied');
      }
      const query = `
        SELECT DISTINCT
          ON (r.roadmap_id, TL1.topic_level1_id) r.roadmap_id,
          r.roadmap_title,
          r.roadmap_description,
          TL1.topic_level1_id,
          TL1.topic_title,
          TL1.topic_description,
          TL1.topic_status,
          TL1.topic_order,
          TC.category_name,
          ps.progress_id,
          ps.student_id,
          ps.state_id AS progress_state_id,
          ps.topic_id,
          ps.topic_level,
          ts.state_name,
          CASE
            WHEN EXISTS (
              SELECT
                1
              FROM
                topic_level_N TLN
              WHERE
                TLN.topic_level1_id = TL1.topic_level1_id
            ) THEN FALSE
            ELSE TRUE
          END AS is_last
        FROM
          Roadmap r
          JOIN Topic_Level_1 TL1 ON r.roadmap_id = TL1.roadmap_id
          LEFT JOIN Topic_Category TC ON TL1.category_id = TC.category_id
          LEFT JOIN Progress_Status ps ON TL1.topic_level1_id = ps.topic_id
          AND ps.topic_level = 1
          AND ps.student_id = $1
          LEFT JOIN Topic_States ts ON ps.state_id = ts.state_id
        WHERE
          r.roadmap_id = $2
        ORDER BY
          r.roadmap_id,
          TL1.topic_level1_id,
          ps.progress_id;
      `;
      const values = [studentId, roadmapId];
      const result = await pool.query(query, values);
      if (result.rows.length === 0) {
        res.status(404).json({
          status: 'error',
          message: 'Roadmap not found',
        });
        return;
      }

      const roadmapData = {
        roadmap_id: result.rows[0].roadmap_id,
        roadmap_title: result.rows[0].roadmap_title,
        roadmap_description: result.rows[0].roadmap_description,
      };

      const topics = result.rows
        .map((row) => ({
          topic_level1_id: row.topic_level1_id,
          topic_title: row.topic_title,
          topic_description: row.topic_description,
          topic_status: row.topic_status,
          topic_order: row.topic_order,
          topic_category: row.category_name,
          isItLast: row.is_last,
        }))
        .filter((topic) => topic.topic_level1_id !== null);

      const progressData = result.rows
        .map((row) => ({
          progress_id: row.progress_id,
          student_id: row.student_id,
          progress_state_id: row.progress_state_id,
          topic_id: row.topic_id,
          state_name: row.state_name,
        }))
        .filter((progress) => progress.progress_id !== null);
      console.log(result.rows);
      res.status(200).json({
        status: 'success',
        roadmap: roadmapData,
        topics: topics,
        progress: progressData,
      });
    }
  } catch (err) {
    console.log(err);
    res.status(500).json({
      status: 'error',
      message: 'An error occurred',
    });
  }
});

//* Returns topics without login by roadmapID
router.get('/:id', async (req, res) => {
  try {
    const roadmap_id = req.params.id;
    const query = `
      SELECT
        Roadmap.*,
        TL1.*,
        TC.category_name
      FROM
        Roadmap
        JOIN Topic_Level_1 TL1 ON Roadmap.roadmap_id = TL1.roadmap_id
        LEFT JOIN Topic_Category TC ON TL1.category_id = TC.category_id
      WHERE
        Roadmap.roadmap_id = $1
    `;
    const result = await pool.query(query, [roadmap_id]);

    if (result.rows.length === 0) {
      res.status(404).json({
        status: 'error',
        message: 'Roadmap not found',
      });
      return;
    }
    const roadmapData = {
      roadmap_id: result.rows[0].roadmap_id,
      roadmap_title: result.rows[0].roadmap_title,
      roadmap_description: result.rows[0].roadmap_description,
      image_path: `http://localhost:5000/image/${decodeURIComponent(result.rows[0].image_path)}`,
    };

    const topics = result.rows.map((row) => ({
      topic_level1_id: row.topic_level1_id,
      topic_title: row.topic_title,
      topic_description: row.topic_description,
      topic_status: row.topic_status,
      topic_order: row.topic_order,
      topic_category: row.category_name,
    }));

    res.status(200).json({
      status: 'success',
      roadmap: roadmapData,
      topics: topics,
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({
      status: 'error',
      message: 'An error occurred',
    });
  }
});

// * Returns topics from the second level with login
router.get('/student/topic/:id', async (req, res) => {
  try {
    const jwtToken = req.header('token');
    const topic_level1_id = req.params.id;
    // eslint-disable-next-line no-undef
    const payload = jwt.verify(jwtToken, process.env.jwtSecret);
    const role_id = payload.roleId;
    console.log(role_id);
    if (!jwtToken || role_id === 1) {
      // If there is no valid authentication (student is not authenticated)
      // Redirect the request to another API endpoint
      return res.redirect(
        `http://localhost:5000/AcademicCompass/roadmap/topic/${topic_level1_id}`,
      );
    } else {
      // Extract student ID from the token and proceed with your logic
      const studentId = payload.userId;
      //permission
      const hasAccess = await checkPermission(
        studentId,
        'show_roadmap',
        role_id,
      );
      if (!hasAccess) {
        return res.status(403).json('Access denied');
      }
      const query = `
        SELECT
          TLN.topic_id AS topic_id_lN,
          TLN.topic_title,
          TLN.topic_description,
          TLN.topic_status,
          TLN.topic_level AS topic_level_lN,
          TLN.topic_order,
          ps.progress_id,
          ps.student_id,
          ps.state_id AS progress_state_id,
          ps.topic_id,
          ps.topic_level,
          ts.state_name,
          CASE
            WHEN EXISTS (
              SELECT
                1
              FROM
                topic_level_N
              WHERE
                TLN.topic_id = topic_level_N.top_level_topic_id
            ) THEN FALSE
            ELSE TRUE
          END AS is_last
        FROM
          topic_level_N TLN
          LEFT JOIN Progress_Status ps ON TLN.topic_id = ps.topic_id
          AND ps.topic_level = 2
          AND ps.student_id = $1
          LEFT JOIN Topic_States ts ON ps.state_id = ts.state_id
        WHERE
          TLN.topic_level1_id = $2
          AND TLN.topic_level = 2;
      `;
      const values = [studentId, topic_level1_id];
      const result = await pool.query(query, values);
      if (result.rows.length === 0) {
        res.status(404).json({
          status: 'error',
          message: 'topic not found',
        });
        return;
      }

      const topics = result.rows
        .map((row) => ({
          topic_id: row.topic_id_ln,
          topic_title: row.topic_title,
          topic_description: row.topic_description,
          topic_status: row.topic_status,
          topic_level: row.topic_level_ln,
          topic_order: row.topic_order,
          isItLast: row.is_last,
        }))
        .filter((topic) => topic.topic_id !== null);

      const progressData = result.rows
        .map((row) => ({
          progress_id: row.progress_id,
          student_id: row.student_id,
          progress_state_id: row.progress_state_id,
          topic_id: row.topic_id,
          topic_level: row.topic_level,
          state_name: row.state_name,
        }))
        .filter((progress) => progress.progress_id !== null);

      res.status(200).json({
        status: 'success',
        topics: topics,
        progress: progressData,
      });
    }
  } catch (err) {
    console.log(err);
    res.status(500).json({
      status: 'error',
      message: 'An error occurred',
    });
  }
});

// * Returns topics from the second level without login
router.get('/topic/:id', async (req, res) => {
  try {
    const topic_level1_id = req.params.id;
    // Extract student ID from the token and proceed with your logic
    const query = `
      SELECT
        topic_id,
        topic_title,
        topic_description,
        topic_status,
        topic_level,
        topic_order,
        CASE
          WHEN EXISTS (
            SELECT
              1
            FROM
              topic_level_N TLN
            WHERE
              TLN.top_level_topic_id = topic_level_N.topic_id
          ) THEN FALSE
          ELSE TRUE
        END AS is_last
      FROM
        topic_level_N
      WHERE
        topic_level1_id = $1
        AND topic_level = 2;
    `;
    const values = [topic_level1_id];
    const result = await pool.query(query, values);
    if (result.rows.length === 0) {
      res.status(404).json({
        status: 'error',
        message: 'topic not found',
      });
      return;
    }

    const topics = result.rows
      .map((row) => ({
        topic_id: row.topic_id,
        topic_title: row.topic_title,
        topic_description: row.topic_description,
        topic_status: row.topic_status,
        topic_level: row.topic_level_ln,
        topic_order: row.topic_order,
        isItLast: row.is_last,
      }))
      .filter((topic) => topic.topic_id !== null);

    res.status(200).json({
      status: 'success',
      topics: topics,
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({
      status: 'error',
      message: 'An error occurred',
    });
  }
});
// * Returns topics from the N level with login
router.get('/student/topicN/:id', async (req, res) => {
  try {
    const jwtToken = req.header('token');
    const topic_levelN_id = req.params.id;
    // eslint-disable-next-line no-undef
    const payload = jwt.verify(jwtToken, process.env.jwtSecret);
    const role_id = payload.roleId;
    if (!jwtToken || role_id === 1) {
      // If there is no valid authentication (student is not authenticated)
      // Redirect the request to another API endpoint
      return res.redirect(
        `http://localhost:5000/AcademicCompass/roadmap/topicN/${topic_levelN_id}`,
      );
    } else {
      // Extract student ID from the token and proceed with your logic
      const studentId = payload.userId;
      //permission
      const hasAccess = await checkPermission(
        studentId,
        'show_roadmap',
        role_id,
      );
      if (!hasAccess) {
        return res.status(403).json('Access denied');
      }
      const query = `
        SELECT
          TLN.topic_id AS topic_id_lN,
          TLN.topic_title,
          TLN.topic_description,
          TLN.topic_status,
          TLN.topic_level AS topic_level_lN,
          TLN.topic_order,
          ps.progress_id,
          ps.student_id,
          ps.state_id AS progress_state_id,
          ps.topic_id,
          ps.topic_level,
          ts.state_name,
          CASE
            WHEN EXISTS (
              SELECT
                1
              FROM
                topic_level_N
              WHERE
                TLN.topic_id = topic_level_N.top_level_topic_id
            ) THEN FALSE
            ELSE TRUE
          END AS is_last
        FROM
          topic_level_N TLN
          LEFT JOIN Progress_Status ps ON TLN.topic_id = ps.topic_id
          AND ps.topic_level = TLN.topic_level
          AND ps.student_id = $1
          LEFT JOIN Topic_States ts ON ps.state_id = ts.state_id
        WHERE
          TLN.top_level_topic_id = $2;
      `;
      const values = [studentId, topic_levelN_id];
      const result = await pool.query(query, values);
      if (result.rows.length === 0) {
        res.status(404).json({
          status: 'error',
          message: 'topic not found',
        });
        return;
      }

      const topics = result.rows
        .map((row) => ({
          topic_id: row.topic_id_ln,
          topic_title: row.topic_title,
          topic_description: row.topic_description,
          topic_status: row.topic_status,
          topic_level: row.topic_level_ln,
          topic_order: row.topic_order,
          isItLast: row.is_last,
        }))
        .filter((topic) => topic.topic_id !== null);

      const progressData = result.rows
        .map((row) => ({
          progress_id: row.progress_id,
          student_id: row.student_id,
          progress_state_id: row.progress_state_id,
          topic_id: row.topic_id,
          topic_level: row.topic_level,
          state_name: row.state_name,
        }))
        .filter((progress) => progress.progress_id !== null);

      res.status(200).json({
        status: 'success',
        topics: topics,
        progress: progressData,
      });
    }
  } catch (err) {
    console.log(err);
    res.status(500).json({
      status: 'error',
      message: 'An error occurred',
    });
  }
});

// * Returns topics from the N level without login
router.get('/topicN/:id', async (req, res) => {
  try {
    const topic_levelN_id = req.params.id;
    // Extract student ID from the token and proceed with your logic
    const query = `
      SELECT
        TLN.topic_id,
        TLN.topic_title,
        TLN.topic_description,
        TLN.topic_status,
        TLN.topic_level AS topic_level_lN,
        TLN.topic_order,
        CASE
          WHEN EXISTS (
            SELECT
              1
            FROM
              topic_level_N
            WHERE
              TLN.topic_id = topic_level_N.top_level_topic_id
          ) THEN FALSE
          ELSE TRUE
        END AS is_last
      FROM
        topic_level_N TLN
      WHERE
        TLN.top_level_topic_id = $1;
    `;
    const values = [topic_levelN_id];
    const result = await pool.query(query, values);
    if (result.rows.length === 0) {
      res.status(404).json({
        status: 'error',
        message: 'topic not found',
      });
      return;
    }

    const topics = result.rows
      .map((row) => ({
        topic_id: row.topic_id,
        topic_title: row.topic_title,
        topic_description: row.topic_description,
        topic_status: row.topic_status,
        topic_level: row.topic_level_ln,
        topic_order: row.topic_order,
        isItLast: row.is_last,
      }))
      .filter((topic) => topic.topic_id !== null);

    res.status(200).json({
      status: 'success',
      topics: topics,
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({
      status: 'error',
      message: 'An error occurred',
    });
  }
});

module.exports = router;
