const db = require('../../database/db');

// Insert Completed Items .
const completed_items = async (itemId, Id) => {
  try {
    const values_itemId = [itemId];
    const values_Id = [Id];

    const courseQuery = 'select course_id from items where item_id = $1;';
    const courseResult = await db.query(courseQuery, values_itemId);
    const course_id = courseResult.rows[0].course_id;

    const enrollmentQuery = `
      SELECT
        enrollment_id,
        progress_state
      FROM
        enrollment
      WHERE
        student_id = $1
        AND course_id = $2;
    `;
    const enrollmentResult = await db.query(enrollmentQuery, [
      values_Id[0],
      course_id,
    ]);
    const enrollId = enrollmentResult.rows[0].enrollment_id;

    // Here I Need To Check From Enrollmnet If Has Done This Item .
    const checkQuery =
      'select completed_item_id from completed_items where enrollment_id = $1 and item_id =$2;';
    const resultQuery = await db.query(checkQuery, [
      enrollId,
      values_itemId[0],
    ]);

    if (resultQuery.rows.length == 0) {
      // Update the progress_state by incrementing it
      const updateProgressQuery = `
        UPDATE enrollment
        SET
          progress_state = $1
        WHERE
          enrollment_id = $2;
      `;
      await db.query(updateProgressQuery, [
        enrollmentResult.rows[0].progress_state + 1,
        enrollId,
      ]);
      const query = `
        INSERT INTO
          Completed_Items (item_id, enrollment_id)
        VALUES
          ($1, $2)
      `;
      // result
      await db.query(query, [values_itemId[0], enrollId]);
      // The item has been added
      return false;
    } else {
      // You Have Already Done it
      return true;
    }
  } catch (err) {
    res.status(500).json({ error: 'Server Error' });
  }
};

module.exports = {
  completed_items,
};
