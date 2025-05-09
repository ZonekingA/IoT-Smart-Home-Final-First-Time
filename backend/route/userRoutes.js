const express = require("express");
const {login, register, getusercode} = require("../controllers/userController"); // นำเข้า userController

const router = express.Router();

router.post("/login",login);
router.post("/register",register);
router.get("/getusercode/:user_id",getusercode);

module.exports = router;
