const pool = require('../../database/db');

const InProgresCourseInfo = async (student_id) => {
  try {
    //* the query dosen't work with ""
    const query =
      'SELECT c.course_id, c.course_title, c.subtitle,c.course_thumnail FROM course c JOIN enrollment e ON c.course_id = e.course_id WHERE e.student_id = $1 AND e.progress_state < c.items_count ORDER BY c.course_title';
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
    console.error('Error Get InProgres Course Info:', error);
    return {
      status: 'error',
      message: 'Get In Progres Course Info is Filed',
    };
  }
};
const completionPercentage = async (student_id) => {
  try {
    const query =
      'SELECT e.student_id, c.course_id,ROUND(  CASE   WHEN c.items_count = e.progress_state THEN 100 ELSE (e.progress_state::float / c.items_count) * 100  END) AS completion_percentage FROM Course c LEFT JOIN Enrollment e ON c.course_id = e.course_id WHERE (e.progress_state IS NULL OR e.progress_state <= c.items_count)  AND e.student_id = $1  AND (e.progress_state != c.items_count OR e.progress_state IS NULL)';
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
    console.error('Error', error);
    return {
      status: 'error',
      message: 'Filed',
    };
  }
};
const starsNumber = async (student_id) => {
  try {
    const Id = student_id;
    // * Get All Coures For student .
    const courese_id = `
      SELECT
        course.course_id
      FROM
        Student
        JOIN enrollment ON Student.student_id = Enrollment.student_id
        JOIN course ON Enrollment.course_id = course.course_id
      WHERE
        student.student_id = '${Id}'
    `;

    const query = `
      SELECT
        c.course_id,
        ROUND(AVG(r.stars_number), 1) AS rating
      FROM
        "course" c
        JOIN "enrollment" e ON c.course_id = e.course_id
        LEFT JOIN "rating" r ON e.enrollment_id = r.enrollment_id
      WHERE
        (
          e.progress_state IS NULL
          OR e.progress_state < c.items_count
        )
        AND c.course_id IN (${courese_id})
        AND (
          e.progress_state != c.items_count
          OR e.progress_state IS NULL
        )
      GROUP BY
        c.course_id
      ORDER BY
        c.course_title;
    `;
    const result = await pool.query(query);
    console.log(result);
    return {
      status: 'success',
      results: result.rows.length,
      Data: {
        data: result.rows[0].rating,
      },
    };
  } catch (error) {
    console.error('Error', error);
    return {
      status: 'error',
      message: 'Filed',
    };
  }
};

module.exports = {
  InProgresCourseInfo,
  completionPercentage,
  starsNumber,
};
