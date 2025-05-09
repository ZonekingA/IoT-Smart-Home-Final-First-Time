const express = require("express");
const { insertroom, insertDevice, updateMultipleDeviceStatus, getRoomsWithDevices, getDevicesByRoom, getStatus
    ,editroom ,deleteroom ,deletedevices ,editdevice
} = require("../controllers/deviceController");
const { verifyToken } = require("../middleware/auth"); // 🔥 Import middleware

const router = express.Router();

router.post("/insertroom", verifyToken, insertroom);
router.post("/insertdevice", verifyToken, insertDevice);
router.post("/updatedevice", updateMultipleDeviceStatus);
router.get("/getRoomsWithDevices", verifyToken,getRoomsWithDevices);
router.get("/devices/:room_id", verifyToken, getDevicesByRoom);
router.put("/editroom", verifyToken, editroom);
router.delete("/deleteroom", verifyToken, deleteroom);
router.get("/getStatus/:device_code", getStatus);
router.put("/editdevice", verifyToken, editdevice);
router.delete("/deletedevice/:device_code", verifyToken, deletedevices);

module.exports = router;