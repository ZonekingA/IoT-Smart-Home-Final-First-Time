const express = require("express");
const {
  insertWeatherData,
  sendSMS,
  getForecastText,
} = require("../controllers/weatherController");
const router = express.Router();

router.post("/insertWeatherData", insertWeatherData);
router.post("/sendSMS", sendSMS);
router.get("/getForecastText", getForecastText);

module.exports = router;
