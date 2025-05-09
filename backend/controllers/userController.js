const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const db = require("../database/db");
const crypto = require("crypto");

let generateDeviceCode;
(async () => {
  const { customAlphabet } = await import("nanoid");
  generateDeviceCode = customAlphabet(
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/",
    5
  );
})();

// Login endpoint
module.exports.login = (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "กรุณากรอกข้อมูลให้ครบถ้วน" });
  }

  // ตรวจสอบ email ในฐานข้อมูล
  const query = "SELECT * FROM user_tbl WHERE email = ?";
  db.query(query, [email], async (err, results) => {
    if (err) {
      console.error("ข้อผิดพลาดในการดึงข้อมูล:", err);
      return res.status(500).json({ error: "เกิดข้อผิดพลาดในการเข้าสู่ระบบ" });
    }

    if (results.length === 0) {
      return res.status(401).json({ error: "อีเมลหรือรหัสผ่านไม่ถูกต้อง" });
    }

    const user = results[0];

    // ตรวจสอบ password ด้วย bcrypt
    const isPasswordMatch = await bcrypt.compare(password, user.password);
    if (!isPasswordMatch) {
      return res.status(401).json({ error: "อีเมลหรือรหัสผ่านไม่ถูกต้อง" });
    }

    // สร้าง JWT token
    const token = jwt.sign(
      {
        user_id: user.user_id,
        email: user.email,
        phone_number: user.phone_number,
      },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    res.json({
      message: "เข้าสู่ระบบสำเร็จ",
      token,
      user: {
        user_id: user.user_id,
        name: user.name,
        email: user.email,
        phone_number: user.phone_number,
      },
    });
  });
};

module.exports.register = async (req, res) => {
  const { name, password, email, phone_number } = req.body;

  if (!name || !password || !email || !phone_number) {
    return res.status(400).send("Please provide all required fields");
  }

  if (password.length < 8) {
    return res.status(400).send("Password must be at least 8 characters long");
  }

  // ตรวจสอบว่าอีเมลมีอยู่แล้วหรือไม่
  const checkEmailQuery = "SELECT * FROM user_tbl WHERE email = ?";
  db.query(checkEmailQuery, [email], async (err, results) => {
    if (err) {
      console.error("Database error: ", err);
      return res.status(500).send("Error checking email");
    }

    if (results.length > 0) {
      return res.status(400).send("Email already exists");
    }

    try {
      const hashedPassword = await bcrypt.hash(password, 10);

      // สุ่ม user_code
      const user_code = generateDeviceCode();

      const insertQuery =
        "INSERT INTO user_tbl (name, password, email, phone_number, user_code) VALUES (?, ?, ?, ?, ?)";
      db.query(
        insertQuery,
        [name, hashedPassword, email, phone_number, user_code],
        (err, result) => {
          if (err) {
            console.error("Database error: ", err);
            return res.status(500).send("Error registering user");
          }

          res
            .status(201)
            .json({ message: "User registered successfully", user_code });
        }
      );
    } catch (error) {
      console.error("Error during registration: ", error);
      return res.status(500).send("Internal server error");
    }
  });
};

module.exports.getusercode = (req, res) => {
  const { user_id } = req.params;

  if (!user_id) {
    return res.status(400).send("User ID is required");
  }

  const query = "SELECT user_code FROM user_tbl WHERE user_id = ?";
  db.query(query, [user_id], (err, results) => {
    if (err) {
      console.error("Database error: ", err);
      return res.status(500).send("Error fetching user_code");
    }

    if (results.length === 0) {
      return res.status(404).send("User not found");
    }

    res.status(200).json({ user_code: results[0].user_code });
  });
};
