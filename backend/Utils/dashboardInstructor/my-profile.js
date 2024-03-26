const pool = require('../../database/db');

// Bring Info & Rating's Instructoer.
const myProfile = async (instructoer_id) => {
  try {
    const value = [instructoer_id];

    // Bring Instructoer Infor .
    const query1 = `
      select
        Users.first_name,
        Users.last_name,
        Users.picture,
        Users.country,
        Users.city
      from
        Users
      WHERE
        user_id = $1
    `;
    const result1 = await pool.query(query1, value);

    // Bring Avg Stra .
    const query2 = `
      SELECT
        ROUND(avg(average), 1) AS avg
      FROM
        (
          SELECT
            avg(rating.stars_number) AS average
          FROM
            Course
            LEFT JOIN Enrollment e ON Course.course_id = e.course_id
            LEFT JOIN rating ON e.enrollment_id = rating.enrollment_id
          WHERE
            Course.instructor_id = $1
          GROUP BY
            Course.course_id
        ) subquery
      WHERE
        average > 0;
    `;
    const result2 = await pool.query(query2, value);
    return {
      status: 'success',
      Data: {
        Instructoer_info: result1.rows[0],
        Instructoer_Rating: result2.rows[0],
      },
    };
  } catch (err) {
    console.error('Error: ', err);
    return {
      status: 'error',
      message: 'Field',
    };
  }
};
module.exports = {
  myProfile,
};
