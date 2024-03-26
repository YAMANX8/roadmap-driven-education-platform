const pool = require('../../../database/db');

// Bring Completed Courses .
const Completed_Courses = async (instructoer_id) => {
  try {
    const value = [instructoer_id];

    const query = `
      SELECT
        c.course_id,
        c.course_title,
        c.subtitle,
        course_thumnail
      FROM
        Course c
        JOIN Course_Lists cl ON c.course_id = cl.course_id
        JOIN List_Type lt ON cl.list_type = lt.type_id
        JOIN Items I ON c.course_id = I.course_id
        JOIN Courses_Type ON c.course_type = Courses_Type.type_id
        JOIN Levels ON c.course_level = Levels.level_id
        LEFT JOIN Video v ON I.item_id = v.item_id
        LEFT JOIN Article a ON I.item_id = a.item_id
        LEFT JOIN Quiz q ON I.item_id = q.item_id
      WHERE
        c.instructor_id = $1
        AND c.subtitle IS NOT NULL
        AND c.c.course_title IS NOT NULL
        AND c.course_description IS NOT NULL
        AND c.course_level IS NOT NULL
        AND c.course_type IS NOT NULL
        AND c.course_thumnail IS NOT NULL
        AND c.course_status = 'true'
      GROUP BY
        c.course_id,
        c.course_title
      HAVING
        COUNT(
          CASE
            WHEN lt.type_name = 'In this course you will learn the following' THEN cl.list_id
          END
        ) >= 1
        AND COUNT(
          CASE
            WHEN lt.type_name = 'Who this course is for:' THEN cl.list_id
          END
        ) >= 1
        AND COUNT(
          CASE
            WHEN lt.type_name = 'Requirements' THEN cl.list_id
          END
        ) >= 1
        AND COUNT(DISTINCT I.item_id) >= 3
        AND (
          COUNT(
            DISTINCT CASE
              WHEN v.item_id IS NOT NULL THEN I.item_id
            END
          ) >= 1
          AND COUNT(
            DISTINCT CASE
              WHEN a.item_id IS NOT NULL THEN I.item_id
            END
          ) >= 1
          AND COUNT(
            DISTINCT CASE
              WHEN q.item_id IS NOT NULL THEN I.item_id
            END
          ) >= 1
        );
    `;

    const result = await pool.query(query, value);
    console.log(result);
    return {
      status: 'success',
      Data: {
        Completed_Courses: result.rows,
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
  Completed_Courses,
};
