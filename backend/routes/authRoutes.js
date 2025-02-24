const express = require("express");
const { register, login, googleAuth } = require("../controller/authController");

const router = express.Router();

router.post("/google", googleAuth);
router.post("/register", register);
router.post("/login", login);

module.exports = router;
