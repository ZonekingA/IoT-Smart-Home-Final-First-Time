const db = require("../database/db");

let generateDeviceCode;
(async () => {
  const { customAlphabet } = await import("nanoid");
  generateDeviceCode = customAlphabet(
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/",
    5
  );
})();

// API สำหรับเพิ่มห้อง
module.exports.insertroom = (req, res) => {
  const { room_name } = req.body;
  const user_id = req.user.user_id;

  if (!room_name) {
    return res.status(400).json({ error: "โปรดระบุชื่อห้อง" });
  }

  const query = "INSERT INTO room_tbl (room_name, user_id) VALUES (?, ?)";
  db.query(query, [room_name, user_id], (err, result) => {
    if (err) {
      console.error("Database Error:", err);
      return res.status(500).json({ error: "เกิดข้อผิดพลาดขณะบันทึกข้อมูล" });
    }
    res
      .status(201)
      .json({ message: "Successfully", insertedId: result.insertId });
  });
};

// API สำหรับเพิ่มอุปกรณ์
module.exports.insertDevice = async (req, res) => {
  const { device_name, device_status, room_id } = req.body;
  const user_id = req.user.user_id;

  if (!device_name || !device_status || !room_id) {
    return res.status(400).send("โปรดกรอกข้อมูลให้ครบถ้วน");
  }

  const getRoomQuery =
    "SELECT room_name FROM room_tbl WHERE room_id = ? AND user_id = ?";
  db.query(getRoomQuery, [room_id, user_id], async (err, result) => {
    if (err) {
      return res.status(500).send("Database error");
    }

    if (result.length === 0) {
      return res
        .status(400)
        .send("คุณไม่สามารถเลือกห้องนี้ได้ เนื่องจากห้องนี้ไม่ใช่ของคุณ");
    }

    const room_name = result[0].room_name; // ดึงชื่อห้องจาก database

    let device_code;
    let isUnique = false;

    while (!isUnique) {
      device_code = generateDeviceCode();
      const checkCodeQuery =
        "SELECT COUNT(*) AS count FROM device_tbl WHERE device_code = ? AND user_id = ?";

      try {
        const [codeResult] = await new Promise((resolve, reject) => {
          db.query(checkCodeQuery, [device_code, user_id], (err, results) => {
            if (err) reject(err);
            resolve(results);
          });
        });

        if (codeResult.count === 0) {
          isUnique = true;
        }
      } catch (error) {
        return res.status(500).send("Error while generating device code");
      }
    }

    const insertQuery =
      "INSERT INTO device_tbl (device_name, device_status, user_id, room_id, device_code, time) VALUES (?, ?, ?, ?, ?, NOW())";

    db.query(
      insertQuery,
      [device_name, device_status, user_id, room_id, device_code],
      (err) => {
        if (err) {
          return res.status(500).send("Error while inserting device");
        }
        res
          .status(201)
          .json({ message: "Device added successfully", device_code });
      }
    );
  });
};

// API ดึงสถานะอุปกรณ์ตาม `device_code`
module.exports.getStatus = (req, res) => {
  const { device_code } = req.params;

  db.query(
    "SELECT device_code, device_name, device_status FROM device_tbl WHERE device_code = ?",
    [device_code],
    (err, result) => {
      if (err) {
        console.error("Database error:", err);
        res.status(500).json({ error: "Database error" });
      } else if (result.length === 0) {
        res.status(404).json({ error: "Device not found" });
      } else {
        res.json(result[0]); // คืนค่าข้อมูลอุปกรณ์
      }
    }
  );
};

// API อัปเดตสถานะ
module.exports.updateMultipleDeviceStatus = (req, res) => {
  const devices = req.body.devices;

  if (!Array.isArray(devices) || devices.length === 0) {
    return res.status(400).json({ error: "Invalid input format" });
  }

  let query = "UPDATE device_tbl SET device_status = CASE ";
  const values = [];

  devices.forEach((device, index) => {
    query += `WHEN device_code = ? THEN ? `;
    values.push(device.device_code, device.device_status); // 'ON' หรือ 'OFF'
  });

  query += "END WHERE device_code IN (";
  query += devices.map(() => "?").join(", ") + ")";
  values.push(...devices.map((d) => d.device_code));

  db.query(query, values, (err, result) => {
    if (err) {
      console.error("Error updating device statuses:", err);
      res.status(500).json({ error: "Failed to update device statuses" });
    } else {
      res.status(200).json({ message: "Device statuses updated successfully" });
    }
  });
};

// select room
module.exports.getRoomsWithDevices = (req, res) => {
  const user_id = req.user.user_id; // ดึง user_id จาก Token

  console.log(req.user);

  const query = `
    SELECT 
        r.room_id,
        r.room_name,
        COUNT(d.device_id) AS total_devices,
        SUM(CASE WHEN d.device_status = 'on' THEN 1 ELSE 0 END) AS devices_on,
        GROUP_CONCAT(d.device_code SEPARATOR ',') AS device_codes
    FROM room_tbl r
    LEFT JOIN device_tbl d ON r.room_id = d.room_id
    WHERE r.user_id = ?
    GROUP BY r.room_id, r.room_name;
  `;

  db.query(query, [user_id], (err, results) => {
    if (err) {
      console.error("Database Error:", err);
      return res
        .status(500)
        .json({ error: "เกิดข้อผิดพลาดในการดึงข้อมูลห้อง" });
    }

    // แปลง device_codes จาก String → Array
    const rooms = results.map((room) => ({
      room_id: room.room_id,
      room_name: room.room_name,
      total_devices: room.total_devices || 0,
      devices_on: room.devices_on || 0,
      status: `${room.devices_on || 0}/${room.total_devices || 0}`, // แสดง "เปิด/ทั้งหมด"
      device_codes: room.device_codes ? room.device_codes.split(",") : [], // แปลงเป็น Array
    }));

    res.json(rooms);
  });
};

//อุปกรณ์ในห้อง
module.exports.getDevicesByRoom = (req, res) => {
  const roomId = req.params.room_id; // ใช้ room_id จาก params
  console.log("Received roomId:", roomId);

  const query = `
    SELECT 
      r.room_name, 
      d.device_code,
      d.device_name, 
      d.device_status,
      (SELECT COUNT(*) FROM device_tbl WHERE room_id = ?) AS total_devices,
      (SELECT COUNT(*) FROM device_tbl WHERE room_id = ? AND device_status = 'ON') AS devices_on
    FROM device_tbl d
    JOIN room_tbl r ON d.room_id = r.room_id
    WHERE d.room_id = ?;
  `;

  db.query(query, [roomId, roomId, roomId], (err, result) => {
    if (err) {
      console.error("Database Error:", err);
      return res.status(500).json({ error: "Database error" });
    }
    const roomName = result[0]?.room_name || "Unknown Room";
    const totalDevices = result[0]?.total_devices || 0;
    const devicesOn = result[0]?.devices_on || 0;

    const response = {
      room_id: roomId,
      room_name: roomName,
      devices_on: `${devicesOn}/${totalDevices}`,
      devices: result.map((device) => ({
        device_code: device.device_code, // เพิ่ม device_code
        device_name: device.device_name,
        device_status: device.device_status,
      })),
    };

    res.json(response);
  });
};

module.exports.editroom = (req, res) => {
  const { room_id, room_name } = req.body;
  const user_id = req.user.user_id;

  if (!room_id || !room_name) {
    return res
      .status(400)
      .json({ error: "โปรดระบุ ID และชื่อห้องที่ต้องการแก้ไข" });
  }

  const query =
    "UPDATE room_tbl SET room_name = ? WHERE room_id = ? AND user_id = ?";
  db.query(query, [room_name, room_id, user_id], (err, result) => {
    if (err) {
      console.error("Database Error:", err);
      return res.status(500).json({ error: "เกิดข้อผิดพลาดขณะอัปเดตข้อมูล" });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "ไม่พบห้องที่ต้องการแก้ไข" });
    }
    res.status(200).json({ message: "Successfully updated" });
  });
};

module.exports.deleteroom = (req, res) => {
  const { room_id } = req.body;
  const user_id = req.user.user_id;

  if (!room_id) {
    return res.status(400).json({ error: "โปรดระบุ ID ห้องที่ต้องการลบ" });
  }

  const deleteDevicesQuery = "DELETE FROM device_tbl WHERE room_id = ?";
  db.query(deleteDevicesQuery, [room_id], (err, result) => {
    if (err) {
      console.error("Database Error:", err);
      return res
        .status(500)
        .json({ error: "เกิดข้อผิดพลาดขณะลบอุปกรณ์ในห้อง" });
    }

    const deleteRoomQuery =
      "DELETE FROM room_tbl WHERE room_id = ? AND user_id = ?";
    db.query(deleteRoomQuery, [room_id, user_id], (err, result) => {
      if (err) {
        console.error("Database Error:", err);
        return res.status(500).json({ error: "เกิดข้อผิดพลาดขณะลบข้อมูล" });
      }
      if (result.affectedRows === 0) {
        return res.status(404).json({ error: "ไม่พบห้องที่ต้องการลบ" });
      }
      res
        .status(200)
        .json({ message: "Successfully deleted room and devices" });
    });
  });
};

module.exports.deletedevices = (req, res) => {
  const { device_code } = req.params; // รับ device_code จาก params
  const user_id = req.user.user_id; // รับ user_id จาก token

  console.log("Deleting device with device_code:", device_code);

  if (!device_code) {
    return res.status(400).json({ error: "โปรดระบุ device_code ที่ต้องการลบ" });
  }

  // ตรวจสอบว่าอุปกรณ์นั้นอยู่ในฐานข้อมูลของผู้ใช้
  const checkDeviceQuery =
    "SELECT * FROM device_tbl WHERE device_code = ? AND user_id = ?";

  db.query(checkDeviceQuery, [device_code, user_id], (err, result) => {
    if (err) {
      console.error("Database Error:", err);
      return res.status(500).json({ error: "เกิดข้อผิดพลาดขณะตรวจสอบข้อมูล" });
    }

    if (result.length === 0) {
      return res.status(404).json({ error: "ไม่พบอุปกรณ์ที่ต้องการลบ" });
    }

    // ลบอุปกรณ์จากฐานข้อมูล
    const deleteDeviceQuery =
      "DELETE FROM device_tbl WHERE device_code = ? AND user_id = ?";
    db.query(deleteDeviceQuery, [device_code, user_id], (err, result) => {
      if (err) {
        console.error("Database Error:", err);
        return res.status(500).json({ error: "เกิดข้อผิดพลาดขณะลบข้อมูล" });
      }

      if (result.affectedRows === 0) {
        return res.status(404).json({ error: "ไม่พบอุปกรณ์ที่ต้องการลบ" });
      }

      res.status(200).json({ message: "Successfully deleted device" });
    });
  });
};

module.exports.editdevice = (req, res) => {
  const { device_code, device_name } = req.body;
  const user_id = req.user.user_id;

  if (!device_code || !device_name) {
    return res
      .status(400)
      .json({ error: "โปรดระบุ ID และชื่ออุปกรณ์ที่ต้องการแก้ไข" });
  }

  const query =
    "UPDATE device_tbl SET device_name = ? WHERE device_code = ? AND user_id = ?";
  db.query(query, [device_name, device_code, user_id], (err, result) => {
    if (err) {
      console.error("Database Error:", err);
      return res.status(500).json({ error: "เกิดข้อผิดพลาดขณะอัปเดตข้อมูล" });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "ไม่พบห้องที่ต้องการแก้ไข" });
    }
    res.status(200).json({ message: "Successfully updated" });
  });
};
