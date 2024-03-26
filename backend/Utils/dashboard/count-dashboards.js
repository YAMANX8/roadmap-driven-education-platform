const pool = require('../../database/db');

const GetCoursesNumberInfo = async (student_id) => {
  try {
    const query =
      // eslint-disable-next-line no-undef
      `
        SELECT
          e.student_id,
          SUM(
            CASE
              WHEN e.progress_state >= c.items_count THEN 1
              ELSE 0
            END
          ) AS completed_courses,
          SUM(
            CASE
              WHEN e.progress_state < c.items_count THEN 1
              ELSE 0
            END
          ) AS incomplete_courses
        FROM
          Enrollment e
          JOIN course c ON e.course_id = c.course_id
        WHERE
          e.student_id = $1
        GROUP BY
          e.student_id
      `;
    const values = [student_id];
    const result = await pool.query(query, values);
    return {
      status: 'success',
      results: result.rows.length,
      Data: {
        data: result.rows,
      },
    };
  } catch (error) {
    console.error('Error Get all Courses in progress and Completed:', error);
    return {
      status: 'error',
      message: 'Get all Courses in progress and Completed is Filed',
    };
  }
};
const GetTotalPoit = async (student_id) => {
  try {
    const query =
      // eslint-disable-next-line no-undef
      `
        WITH
          PointsPerEnrollment AS (
            SELECT
              e.enrollment_id,
              SUM(
                CASE
                  WHEN o.is_correct THEN 1
                  ELSE 0
                END
              ) AS points
            FROM
              enrollment e
              INNER JOIN Student_Answers sa ON e.enrollment_id = sa.enrollment_id
              LEFT JOIN course c ON e.course_id = c.course_id
              LEFT JOIN items i ON c.course_id = i.item_id
              LEFT JOIN quiz q ON i.item_id = q.quiz_id
              INNER JOIN Option o ON sa.option_no = o.option_no
              AND sa.question_no = o.question_id
            WHERE
              e.student_id = $1
            GROUP BY
              e.enrollment_id
          )
        SELECT
          SUM(points) AS total_points
        FROM
          PointsPerEnrollment
      `;
    const values = [student_id];
    const result = await pool.query(query, values);
    return {
      status: 'success',
      results: result.rows.length,
      Data: {
        data: result.rows,
      },
    };
  } catch (error) {
    console.error('Error Get TotalPoint', error);
    return {
      status: 'error',
      message: 'Get Total Point is Filed',
    };
  }
};

module.exports = {
  GetCoursesNumberInfo,
  GetTotalPoit,
};
