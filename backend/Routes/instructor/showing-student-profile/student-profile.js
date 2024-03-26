const router = require('express').Router();
const pool = require('../../../database/db');
const checkPermission = require('../../../middleware/check-permissions');
const authorization = require('../../../middleware/authorization');

router.get('/:studentId', authorization, async (req, res) => {
  try {
    const Id = req.params.studentId;
    const instructorId = req.user.userId;
    const roleId = req.user.roleId;
    console.log(roleId);
    //permission
    const hasAccess = await checkPermission(
      instructorId,
      'showStudentProfile',
      roleId,
    );
    if (!hasAccess) {
      return res.status(403).json('Access denied');
    }
    // eslint-disable-next-line no-undef
    const query = `
      SELECT
        *
      FROM
        student
      WHERE
        student_id = $1
    `;
    const value = [Id];
    const result = await pool.query(query, value);

    //response
    const response = result.rows.map((row) => ({
      id: row.student_id,
      first_name: row.first_name,
      last_name: row.last_name,
      email: row.email,
      education: row.education,
      country: row.country,
      city: row.city,
      birth_date: row.birth_date,
      bio: row.bio,
      picture: `'http://localhost:5000/image/${row.picture}`,
    }));
    res.status(200).json(response);
  } catch (err) {
    console.error(err.message);
    res.status(500).json('Server Error');
  }
});

module.exports = router;
