const pool = require('../../database/db');

// Bring Info & Rating's Instructoer.
const GetMyTopics = async (instructoer_id) => {
  try {
    const value = [instructoer_id];

    // Bring Avg Stra .
    const query = `
      SELECT
        Assigning_Topics.topic_level1_id,
        Topic_Level_1.topic_title,
        Topic_Level_1.roadmap_id
      FROM
        Assigning_Topics
        LEFT JOIN Topic_Level_1 ON Assigning_Topics.topic_level1_id = Topic_Level_1.topic_level1_id
      WHERE
        Assigning_Topics.instructor_id = $1;
    `;
    const result = await pool.query(query, value);
    return {
      status: 'success',
      Data: {
        mytopic: result.rows,
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
  GetMyTopics,
};
