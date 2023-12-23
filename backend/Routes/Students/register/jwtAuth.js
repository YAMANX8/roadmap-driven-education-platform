const router = require("express").Router();
const pool = require("../../../Database/db");
const bcrypt = require("bcrypt");
const jwtGenerator = require("../../../Utils/jwtGenerator");
const validInfo = require("../../../middleware/validInfo");
const authorization = require("../../../middleware/authorization.js");
const dotenv = require("dotenv");
dotenv.config();
//register route

router.post("/student/register", validInfo, async (req, res) => {
  try {
    // 1. destructure the req.body (first_name,last_name,email,password)

    const { first_name, last_name, email, password } = req.body;
    const role_id = 2;
    // 2. check if student exist (if student exist then throw error)
    const student = await pool.query("SELECT * FROM student WHERE email=$1", [
      email,
    ]);
    if (student.rows.length !== 0) {
      return res.status(401).json("student already exist");
    }
    // 3. Bcrypt the students password

    const saltRound = 10;
    const salt = await bcrypt.genSalt(saltRound);
    const bcryptPassword = await bcrypt.hash(password, salt);
    // 4.enter the new student inside our database
    const newStudent = await pool.query(
      "INSERT INTO student  (first_name,last_name,email,password,role_id) VALUES ($1,$2,$3,$4,$5) RETURNING *",
      [first_name, last_name, email, bcryptPassword, role_id]
    );

    // 5.generating our jwt token
    const { accessToken,refreshToken } = jwtGenerator(
      newStudent.rows[0].student_id,
      newStudent.rows[0].role_id
    );
    res.cookie("jwt", refreshToken, {
      httpOnly: true,
      sameSite: "None",
      secure: true,
      maxAge: 24 * 60 * 60 * 1000,
    });
    res.status(200).json({ accessToken, role_id });
  } catch (error) {
    console.error(error.message);
    res.status(500).send("Server Error");
  }
});

//login route

router.post("/student/login", validInfo, async (req, res) => {
  try {
    // 1. destructure req.body

    const { email, password } = req.body;
    const role_id = 2;
    // 2. check student doesn't exist (if not then throw error)
    const student = await pool.query("SELECT * FROM student WHERE email=$1", [
      email,
    ]);

    if (student.rows.length == 0) {
      return res.status(401).json("Password or Email is incorrect");
    }
    // 3. check if incoming password is the same the database password

    const validPassword = await bcrypt.compare(
      password,
      student.rows[0].password
    ); //true or false
    if (!validPassword) {
      return res.status(401).json("Password or Email is incorrect");
    }

    // 4. give them the jwt token
    else if (validPassword) {
      const { accessToken, refreshToken } = jwtGenerator(
        student.rows[0].student_id,
        student.rows[0].role_id
      );

      res.cookie("jwt", refreshToken, {
        httpOnly: true,
        sameSite: "None",
        secure: true,
        maxAge: 24 * 60 * 60 * 1000,
      });
      return res.status(200).json({ accessToken, role_id });
    }
  } catch (error) {
    console.error(error);
    res.status(500).send("Server Error");
  }
});

//  correct token
router.get("/is-verify", authorization, async (req, res) => {
  try {
    res.json(true);
  } catch (error) {
    console.error(error);
    res.status(500).send("Server Error");
  }
});

module.exports = router;