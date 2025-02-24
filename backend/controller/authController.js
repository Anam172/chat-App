const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { OAuth2Client } = require("google-auth-library");
const User = require("../models/User");

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Google Auth
const googleAuth = async (req, res) => {
  const { token } = req.body;

  try {
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const { sub, name, email, picture } = ticket.getPayload();
    let user = await User.findOne({ email });

    if (!user) {
      user = await User.create({ name, email, googleId: sub, picture });
    }

    const jwtToken = jwt.sign({ id: user._id, name, email }, process.env.JWT_SECRET, { expiresIn: "1h" });

    res.status(200).json({ user, token: jwtToken });
  } catch (error) {
    res.status(400).json({ error: "Invalid Google token" });
  }
};

// Signup
const register = async (req, res) => {
  const { name, email, password } = req.body;

  try {
    const userExists = await User.findOne({ email });
    if (userExists) return res.status(400).json({ message: "User already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, password: hashedPassword });

    res.status(201).json({ message: "User registered successfully" });
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
};

// Login
const login = async (req, res) => {
    const { email, password } = req.body;
  
    try {
      const user = await User.findOne({ email });
      if (!user) return res.status(400).json({ message: "User not found" });
  
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) return res.status(400).json({ message: "Incorrect password" });
  
      const token = jwt.sign({ id: user._id, name: user.name, email: user.email }, process.env.JWT_SECRET, {
        expiresIn: "1h",
      });
  
      res.status(200).json({ user, token });
    } catch (error) {
      console.error("Server error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  };
  

module.exports = { register, login, googleAuth };
