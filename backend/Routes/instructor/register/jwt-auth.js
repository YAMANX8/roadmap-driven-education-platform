const router = require('express').Router();
const pool = require('../../../database/db.js');
const bcrypt = require('bcrypt');
const jwtGenerator = require('../../../Utils/jwt-generator.js');
const validInfo = require('../../../middleware/valid-info');
const authorization = require('../../../middleware/authorization.js');

//register route

router.post('/instructor/register', validInfo, async (req, res) => {
  try {
    // 1. destructure the req.body (first_name,last_name,email,password)

    const { first_name, last_name, email, password } = req.body;
    const role_id = 1;
    // 2. check if instructor exist (if instructor exist then throw error)
    const instructor = await pool.query(
      `
        SELECT
          *
        FROM
          Users
        WHERE
          email = $1
      `,
      [email],
    );
    if (instructor.rows.length !== 0) {
      return res.status(401).json('instructor already exist');
    }
    // 3. Bcrypt the instructors password

    const saltRound = 10;
    const salt = await bcrypt.genSalt(saltRound);
    const bcryptPassword = await bcrypt.hash(password, salt);
    // 4.enter the new student inside our database
    const newInstructor = await pool.query(
      `
        INSERT INTO
          Users (first_name, last_name, email, password, role_id)
        VALUES
          ($1, $2, $3, $4, $5)
        RETURNING
          *
      `,
      [first_name, last_name, email, bcryptPassword, role_id],
    );

    // 5.generating our jwt token
    const { token, refreshToken } = jwtGenerator(
      newInstructor.rows[0].student_id,
      newInstructor.rows[0].role_id,
    );
    res.cookie('jwt', refreshToken, {
      httpOnly: true,
      sameSite: 'Lax',
      secure: true,
      maxAge: 24 * 60 * 60 * 1000,
    });
    res.status(200).json({ token, user: newInstructor.rows[0] });
  } catch (error) {
    console.error(error.message);
    res.status(500).send('Server Error');
  }
});

//login route

router.post('/instructor/login', validInfo, async (req, res) => {
  try {
    // 1. destructure req.body

    const { email, password } = req.body;
    // const role_id = 1;
    // 2. check student doesn't exist (if not then throw error)
    const instructor = await pool.query(
      `
        SELECT
          *
        FROM
          Users
        WHERE
          email = $1
      `,
      [email],
    );

    if (instructor.rows.length == 0) {
      return res.status(401).json('Password or Email is incorrect');
    }
    // 3. check if incoming password is the same the database password
    const validPassword = await bcrypt.compare(
      password,
      instructor.rows[0].password,
    ); //true or false
    if (!validPassword) {
      return res.status(401).json('Password or Email is incorrect');
    }

    // 4. give them the jwt token
    else if (validPassword) {
      const { token, refreshToken } = jwtGenerator(
        instructor.rows[0].user_id,
        instructor.rows[0].role_id,
      );

      res.cookie('jwt', refreshToken, {
        httpOnly: true,
        sameSite: 'None',
        secure: true,
        maxAge: 24 * 60 * 60 * 1000,
      });
      return res.status(200).json({ token, user: instructor.rows[0] });
    }
  } catch (error) {
    console.error(error);
    res.status(500).send('Server Error');
  }
});

//  correct token
router.get('/me', authorization, async (req, res) => {
  try {
    // user
    const userId = req.user.userId;
    const roleId = req.user.roleId;
    let query = '';
    let value;
    // user is student
    if (roleId === 2) {
      query = `SELECT * FROM student WHERE student_id = $1`;
      value = [userId];
    } else if (roleId === 1) {
      query = `SELECT * FROM users WHERE user_id = $1`;
      value = [userId];
    } else {
      return res.status(403);
    }
    const Result = await pool.query(query, value);
    if (Result.rows[0] !== undefined) {
      return res.status(200).json({ token, user: Result.rows[0] });
    } else {
      return res.status(404);
    }
    // testing 401-403-404
    // res.json(true);
  } catch (error) {
    console.error(error);
    res.status(500).send('Server Error');
  }
});

module.exports = router;
