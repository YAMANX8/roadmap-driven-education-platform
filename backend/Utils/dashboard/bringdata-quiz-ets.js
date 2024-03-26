const pool = require('../../database/db');

// Bring (quiz video and artical) numbers Fro Studnet
const qva = async (student_id) => {
  try {
    const query = `
      SELECT
        COUNT(
          CASE
            WHEN it.type_name = 'article' THEN 1
          END
        ) AS article_count,
        COUNT(
          CASE
            WHEN it.type_name = 'video' THEN 1
          END
        ) AS video_count,
        COUNT(
          CASE
            WHEN it.type_name = 'quiz' THEN 1
          END
        ) AS quiz_count
      FROM
        enrollment e
        JOIN completed_items ci ON e.enrollment_id = ci.enrollment_id
        JOIN items i ON ci.item_id = i.item_id
        JOIN Items_Types it ON i.item_type = it.type_id
      WHERE
        e.student_id = $1;
    `;

    const values = [student_id];
    const result = await pool.query(query, values);
    return {
      status: 'success',
      results: result.rows.length,
      Data: {
        data: result.rows[0],
      },
    };
  } catch (err) {
    console.error('Error Get Quiz Video Artical : ', err);
    return {
      status: 'error',
      message: 'Error Get Quiz Video Artical Is Field',
    };
  }
};

module.exports = {
  qva,
};
