const mysql = require("mysql");

const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "",
  database: "project_database",
});

db.connect((err) => {
  if (err) {
    console.error("เชื่อมต่อฐานข้อมูลล้มเหลว:", err);
    throw err;
  }
});

module.exports = db;
