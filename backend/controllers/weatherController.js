require("dotenv").config();
const axios = require("axios");
const db = require("../database/db");
const { spawn } = require("child_process");

// โหลดค่าจาก .env
if (!process.env.THSMS_USERNAME || !process.env.THSMS_PASSWORD) {
  console.error("THSMS Username or Password is missing in .env file");
  process.exit(1);
}

const THSMS_USERNAME = process.env.THSMS_USERNAME;
const THSMS_PASSWORD = process.env.THSMS_PASSWORD;

// ฟังก์ชันแปลงเบอร์โทรเป็นรูปแบบที่ถูกต้อง
const formatPhoneNumber = (phone) => {
  if (!phone) return "";

  let cleanedPhone = phone.replace(/\D/g, "");

  if (cleanedPhone.startsWith("66") && cleanedPhone.length === 11) {
    return cleanedPhone;
  }

  if (cleanedPhone.startsWith("0") && cleanedPhone.length === 10) {
    return "66" + cleanedPhone.slice(1);
  }

  return cleanedPhone;
};

// ฟังก์ชันส่ง SMS
const sendSMS = async (phone_number, message) => {
  try {
    console.log("Original phone number:", phone_number);
    const formattedPhone = formatPhoneNumber(phone_number);
    console.log("Formatted phone number:", formattedPhone);

    if (!/^66\d{9}$/.test(formattedPhone)) {
      throw new Error("Invalid phone number format after conversion");
    }

    const smsResponse = await axios.get("https://www.thsms.com/api/rest", {
      params: {
        method: "send",
        username: THSMS_USERNAME,
        password: THSMS_PASSWORD,
        from: "E-Marketing",
        to: formattedPhone,
        message,
      },
    });

    console.log("SMS ส่งสำเร็จ:", smsResponse.data);
    return smsResponse.data;
  } catch (error) {
    console.error(
      "ส่ง SMS ไม่สำเร็จ:",
      error.response ? error.response.data : error.message
    );
    throw error;
  }
};

const insertWeatherData = (req, res) => {
  const { user_code, temperature: tempC, humidity, wind_speed } = req.body;

  if (!user_code) {
    return res.status(400).json({ error: "Missing user_code" });
  }

  const temperature = (tempC * 9) / 5 + 32;

  // ดึง user_id และ phone_number จาก user_code
  const queryGetUser = `
    SELECT user_id, phone_number 
    FROM user_tbl 
    WHERE user_code = ?
  `;
  db.query(queryGetUser, [user_code], (err, result) => {
    if (err) {
      console.error("Error fetching user:", err);
      return res
        .status(500)
        .json({ error: "Error fetching user", details: err });
    }

    if (result.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    const { user_id, phone_number } = result[0];

    // ตรวจสอบว่าเคยส่ง SMS ในวันนี้หรือยัง
    const today = new Date().toISOString().split("T")[0];
    const queryCheckSMS = `
      SELECT 1 FROM weather_tbl 
      WHERE user_id = ? AND DATE(timestamp) = ? AND forecast = 1 AND sms_sent = 1
    `;
    db.query(queryCheckSMS, [user_id, today], (err, smsResult) => {
      if (err) {
        console.error("Error checking SMS status:", err);
        return res
          .status(500)
          .json({ error: "Error checking SMS", details: err });
      }

      // ถ้าเคยส่ง SMS แล้ววันนี้
      if (smsResult.length > 0) {
        return res.status(200).json({ message: "SMS already sent today" });
      }

      // เรียก Flask API เพื่อทำนาย
      axios
        .post("http://127.0.0.1:5000/predict", {
          temperature,
          humidity,
          wind_speed,
        })
        .then(async (aiResponse) => {
          const forecast = aiResponse.data.forecast || 0;
          let sms_sent = 0;

          if (forecast === 1) {
            const message = `แจ้งเตือน: มีโอกาสฝนตก! อุณหภูมิ ${tempC}°C, ความชื้น ${humidity}%, ลม ${wind_speed} m/h พกร่มด้วยละ`;

            try {
              await sendSMS(phone_number, message);
              sms_sent = 1;
            } catch (smsError) {
              console.error("Error sending SMS:", smsError);
              sms_sent = 0; // ถ้าส่งไม่สำเร็จก็ให้เป็น 0
            }
          }

          // บันทึกข้อมูลลงฐานข้อมูล หลังจากส่ง SMS แล้ว
          const insertQuery = `
            INSERT INTO weather_tbl (user_id, temperature, humidity, wind_speed, forecast, sms_sent, timestamp) 
            VALUES (?, ?, ?, ?, ?, ?, NOW())
          `;
          db.query(
            insertQuery,
            [user_id, temperature, humidity, wind_speed, forecast, sms_sent],
            (err, result) => {
              if (err) {
                console.error("Insert error:", err);
                return res
                  .status(500)
                  .json({ error: "Database insert error", details: err });
              }

              res.status(201).json({
                id: result.insertId,
                user_id,
                temperature,
                humidity,
                wind_speed,
                forecast,
                sms_sent,
                timestamp: new Date(),
              });
            }
          );
        })

        .catch((error) => {
          console.error("AI prediction error:", error);
          res.status(500).json({ error: "AI prediction failed" });
        });
    });
  });
};

const getForecastText = async (req, res) => {
  try {
    const query = `
      SELECT 
        CASE 
          WHEN forecast = 1 THEN 'ตก' 
          ELSE 'ไม่ตก' 
        END AS forecast_text
      FROM weather_tbl 
      ORDER BY timestamp DESC 
      LIMIT 1;
    `;

    db.query(query, (err, results) => {
      if (err) {
        console.error("Database Error:", err);
        return res.status(500).json({ error: "Database error" });
      }

      if (results.length === 0) {
        return res.status(404).json({ message: "No forecast data found" });
      }

      res.json({ forecast_text: results[0].forecast_text });
    });
  } catch (error) {
    console.error("Error fetching forecast text:", error);
    res.status(500).json({ error: "Server error" });
  }
};

module.exports = {
  insertWeatherData,
  sendSMS,
  getForecastText, // เพิ่มฟังก์ชันนี้
};
