const express = require("express");
const bodyParser = require("body-parser");
const userController = require("./route/userRoutes");
const deviceController = require("./route/deviceRoutes");
const weatherController = require("./route/weatherRoutes");
const WebSocket = require("ws");
const os = require("os");

const app = express();
const PORT = 3000;

//  แก้ไขให้ WebSocket รับทุก IP ในเครือข่าย
const wss = new WebSocket.Server({ host: "0.0.0.0", port: 8080 });

//  ตรวจสอบและแสดง IP Address ของ Server
const networkInterfaces = os.networkInterfaces();
const ipAddresses = [];
for (const iface of Object.values(networkInterfaces)) {
  for (const ifaceInfo of iface) {
    if (ifaceInfo.family === "IPv4" && !ifaceInfo.internal) {
      ipAddresses.push(ifaceInfo.address);
    }
  }
}
console.log(" WebSocket Server is running on:");
ipAddresses.forEach((ip) => console.log(`   ws://${ip}:8080`));

// จัดการ WebSocket Connection
wss.on("connection", (ws) => {
  console.log("New Client Connected");

  // เมื่อได้รับข้อมูลจาก client
  ws.on("message", (message) => {
    console.log("Received from Client:", message);

    try {
      const parsedMessage = JSON.parse(message);
      console.log("Parsed JSON:", parsedMessage);

      // ส่งข้อมูลไปยังทุก client
      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          console.log("Broadcasting to Clients:", parsedMessage);
          client.send(JSON.stringify(parsedMessage));
        }
      });
    } catch (error) {
      console.error("JSON Parsing Error on Server:", error);
    }
  });

  ws.on("close", () => {
    console.log("Client Disconnected");
  });
});

//  ป้องกัน WebSocket Disconnect โดยส่ง Ping ทุก 30 วินาที
setInterval(() => {
  wss.clients.forEach((ws) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.ping();
    }
  });
}, 30000);

// สร้าง Web Server สำหรับ REST API
app.use(express.static("public"));
app.use(bodyParser.json());

//  เชื่อมต่อ API Routes
app.use("/api/user", userController);
app.use("/api/device", deviceController);
app.use("/api/weather", weatherController);

//  API สำหรับควบคุมอุปกรณ์
app.post("/control", (req, res) => {
  const { action } = req.body; // รับ action ที่เป็น ON หรือ OFF

  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(action); // ส่งคำสั่งไปยัง ESP32
    }
  });

  res.send(` Action '${action}' sent to ESP32`);
});

//  เริ่มต้น Express Web Server
app.listen(PORT, "0.0.0.0", () => {
  console.log(` HTTP Server is running on: http://${ipAddresses[0]}:${PORT}`);
});
