const express = require("express");
const bcrypt = require("bcryptjs");
const { OAuth2Client } = require("google-auth-library");
const User = require("../models/User");

const router = express.Router();
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

function formatUser(user) {
  return {
    id: user._id,
    username: user.username,
    email: user.email
  };
}

router.get("/google-config", (req, res) => {
  res.json({ googleClientId: process.env.GOOGLE_CLIENT_ID || "" });
});

/* REGISTER */
router.post("/register", async (req, res) => {
  try {
    const { username, email, password } = req.body;
    if (!username || !email || !password) {
      return res.status(400).json({ message: "Username, email, and password are required" });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(400).json({ message: "Email is already registered" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new User({
      username,
      email: normalizedEmail,
      password: hashedPassword,
      authProvider: "local"
    });

    await user.save();

    res.json({ message: "Registration successful", user: formatUser(user) });
  } catch (error) {
    res.status(500).json({ message: "Registration failed" });
  }
});

/* LOGIN */
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(400).json({ message: "User not found" });
    }
    if (user.authProvider === "google") {
      return res.status(409).json({
        message: "This account uses Google Sign-In. Continue with Google to login.",
        requiresGoogleSignIn: true
      });
    }
    if (!user.password) {
      return res.status(400).json({ message: "Password login is not available for this account" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Wrong password" });
    }

    res.json({ message: "Login successful", user: formatUser(user) });
  } catch (error) {
    res.status(500).json({ message: "Login failed" });
  }
});

/* GOOGLE AUTH (REGISTER OR LOGIN) */
router.post("/google-auth", async (req, res) => {
  try {
    const { credential } = req.body;
    if (!credential) {
      return res.status(400).json({ message: "Google credential is required" });
    }
    if (!process.env.GOOGLE_CLIENT_ID) {
      return res.status(500).json({ message: "GOOGLE_CLIENT_ID is not configured on server" });
    }

    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID
    });

    const payload = ticket.getPayload();
    if (!payload?.email || !payload?.sub) {
      return res.status(400).json({ message: "Invalid Google token payload" });
    }

    const normalizedEmail = payload.email.trim().toLowerCase();
    let user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      user = new User({
        username: payload.name || normalizedEmail.split("@")[0],
        email: normalizedEmail,
        authProvider: "google",
        googleId: payload.sub
      });
      await user.save();
      return res.json({ message: "Google registration successful", user: formatUser(user) });
    }

    if (user.authProvider === "local") {
      return res.status(400).json({
        message: "This email is already registered with password login. Please login with email/password."
      });
    }

    if (!user.googleId) {
      user.googleId = payload.sub;
      await user.save();
    }

    return res.json({ message: "Google login successful", user: formatUser(user) });
  } catch (error) {
    return res.status(401).json({ message: "Google authentication failed" });
  }
});

module.exports = router;
