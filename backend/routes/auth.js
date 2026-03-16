const express = require("express");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const nodemailer = require("nodemailer");
const { OAuth2Client } = require("google-auth-library");
const User = require("../models/User");

const router = express.Router();
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const APP_BASE_URL = process.env.APP_BASE_URL || "http://localhost:8000";
const MAIL_FROM = process.env.MAIL_FROM || process.env.SMTP_USER || "no-reply@plant-ai.local";
const PASSWORD_RESET_TTL_MS = Number(process.env.PASSWORD_RESET_TTL_MS || 60 * 60 * 1000);

function formatUser(user) {
  return {
    id: user._id,
    username: user.username,
    email: user.email,
    isEmailVerified: !!user.isEmailVerified
  };
}

function createVerificationToken() {
  const rawToken = crypto.randomBytes(32).toString("hex");
  const hashedToken = crypto.createHash("sha256").update(rawToken).digest("hex");
  return { rawToken, hashedToken };
}

function getTransporter() {
  const hasSmtp =
    !!process.env.SMTP_HOST &&
    !!process.env.SMTP_PORT &&
    !!process.env.SMTP_USER &&
    !!process.env.SMTP_PASS;

  if (!hasSmtp) return null;

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
}

async function sendVerificationEmail(email, username, rawToken) {
  const verifyUrl = `${APP_BASE_URL}/api/verify-email?token=${encodeURIComponent(rawToken)}`;
  const transporter = getTransporter();

  if (!transporter) {
    throw new Error(`SMTP not configured. Verification link for ${email}: ${verifyUrl}`);
  }

  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#0f172a">
      <h2 style="margin:0 0 12px">Confirm your Plant AI account</h2>
      <p style="margin:0 0 12px">Hi ${username || "there"},</p>
      <p style="margin:0 0 18px">Please confirm your email to access your account and Garden data.</p>
      <a href="${verifyUrl}" style="display:inline-block;background:#16a34a;color:#fff;text-decoration:none;padding:10px 16px;border-radius:8px;font-weight:700">Verify Email</a>
      <p style="margin:18px 0 0;color:#475569;font-size:12px">If the button doesn't work, paste this URL in your browser:<br/>${verifyUrl}</p>
    </div>
  `;

  await transporter.sendMail({
    from: MAIL_FROM,
    to: email,
    subject: "Confirm your Plant AI account",
    html
  });
}

async function sendPasswordResetEmail(email, username, rawToken) {
  const resetUrl = `${APP_BASE_URL}/api/reset-password?token=${encodeURIComponent(rawToken)}`;
  const transporter = getTransporter();

  if (!transporter) {
    throw new Error(`SMTP not configured. Password reset link for ${email}: ${resetUrl}`);
  }

  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#0f172a">
      <h2 style="margin:0 0 12px">Reset your Plant AI password</h2>
      <p style="margin:0 0 12px">Hi ${username || "there"},</p>
      <p style="margin:0 0 18px">We received a request to reset your password. Use the button below to set a new one.</p>
      <a href="${resetUrl}" style="display:inline-block;background:#16a34a;color:#fff;text-decoration:none;padding:10px 16px;border-radius:8px;font-weight:700">Set New Password</a>
      <p style="margin:18px 0 0;color:#475569;font-size:12px">This link expires in 1 hour. If you did not request this, you can ignore this email.</p>
      <p style="margin:8px 0 0;color:#475569;font-size:12px">If the button doesn't work, paste this URL in your browser:<br/>${resetUrl}</p>
    </div>
  `;

  await transporter.sendMail({
    from: MAIL_FROM,
    to: email,
    subject: "Reset your Plant AI password",
    html
  });
}

function renderVerifyPage(title, message, isSuccess) {
  const accent = isSuccess ? "#16a34a" : "#dc2626";
  const action = isSuccess ? "You can now log in." : "Please request a new verification email.";
  return `
    <!doctype html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>${title}</title>
      </head>
      <body style="margin:0;font-family:Arial,sans-serif;background:#f8fafc;display:flex;min-height:100vh;align-items:center;justify-content:center;padding:16px;">
        <div style="max-width:520px;width:100%;background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:24px;box-shadow:0 10px 30px rgba(15,23,42,.08)">
          <h1 style="margin:0 0 10px;font-size:22px;color:${accent}">${title}</h1>
          <p style="margin:0 0 8px;color:#0f172a">${message}</p>
          <p style="margin:0;color:#475569;font-size:14px">${action}</p>
        </div>
      </body>
    </html>
  `;
}

function renderResetPasswordPage({ title, message, isSuccess, showForm = false, token = "" }) {
  const accent = isSuccess ? "#16a34a" : "#dc2626";
  const safeToken = String(token || "");
  const formHtml = showForm
    ? `
      <form id="resetForm" style="margin-top:16px;display:grid;gap:12px;">
        <label for="newPassword" style="font-size:14px;color:#0f172a;font-weight:600">New Password</label>
        <input id="newPassword" type="password" minlength="8" required
          style="border:1px solid #cbd5e1;border-radius:8px;padding:10px 12px;font-size:14px;" />
        <button id="resetBtn" type="submit"
          style="border:0;border-radius:8px;background:#16a34a;color:#fff;padding:10px 16px;font-weight:700;cursor:pointer;">
          Update Password
        </button>
        <p id="resetStatus" style="margin:0;font-size:13px;color:#475569;"></p>
      </form>
      <script>
        (function () {
          var token = ${JSON.stringify(safeToken)};
          var form = document.getElementById("resetForm");
          var status = document.getElementById("resetStatus");
          var btn = document.getElementById("resetBtn");
          if (!form || !status || !btn) return;

          form.addEventListener("submit", async function (event) {
            event.preventDefault();
            var passwordInput = document.getElementById("newPassword");
            var password = (passwordInput && passwordInput.value) || "";
            if (password.length < 8) {
              status.textContent = "Password must be at least 8 characters.";
              status.style.color = "#dc2626";
              return;
            }

            btn.disabled = true;
            btn.textContent = "Updating...";
            status.textContent = "";

            try {
              var response = await fetch("/api/reset-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ token: token, password: password })
              });
              var data = await response.json().catch(function () { return {}; });
              if (!response.ok) {
                status.textContent = data.message || "Password reset failed.";
                status.style.color = "#dc2626";
                btn.disabled = false;
                btn.textContent = "Update Password";
                return;
              }
              status.textContent = data.message || "Password updated successfully. You can now log in.";
              status.style.color = "#16a34a";
              form.reset();
              btn.textContent = "Updated";
            } catch (error) {
              status.textContent = "Server error while resetting password.";
              status.style.color = "#dc2626";
              btn.disabled = false;
              btn.textContent = "Update Password";
            }
          });
        })();
      </script>
    `
    : "";

  return `
    <!doctype html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>${title}</title>
      </head>
      <body style="margin:0;font-family:Arial,sans-serif;background:#f8fafc;display:flex;min-height:100vh;align-items:center;justify-content:center;padding:16px;">
        <div style="max-width:520px;width:100%;background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:24px;box-shadow:0 10px 30px rgba(15,23,42,.08)">
          <h1 style="margin:0 0 10px;font-size:22px;color:${accent}">${title}</h1>
          <p style="margin:0;color:#0f172a">${message}</p>
          ${formHtml}
        </div>
      </body>
    </html>
  `;
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
    if (String(password).length < 8) {
      return res.status(400).json({ message: "Password must be at least 8 characters" });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      if (existingUser.authProvider === "google") {
        return res.status(409).json({
          message: "This email is already registered with Google Sign-In. Continue with Google to proceed.",
          requiresGoogleSignIn: true
        });
      }
      return res.status(400).json({ message: "Email is already registered" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const { rawToken, hashedToken } = createVerificationToken();

    const user = new User({
      username,
      email: normalizedEmail,
      password: hashedPassword,
      authProvider: "local",
      isEmailVerified: false,
      emailVerificationToken: hashedToken,
      emailVerificationExpires: new Date(Date.now() + 24 * 60 * 60 * 1000)
    });

    await user.save();

    let mailNotice = "Check your email to verify your account before login.";
    let mailErrorDetail = null;
    try {
      await sendVerificationEmail(normalizedEmail, username, rawToken);
    } catch (mailError) {
      console.error("Verification email send failed:", mailError?.message || mailError);
      mailNotice = "Account created. Verification email could not be sent right now; contact support or retry later.";
      mailErrorDetail = mailError?.message || String(mailError);
    }

    const payload = {
      message: `Registration successful. ${mailNotice}`,
      requiresEmailVerification: true,
      user: formatUser(user)
    };
    if (mailErrorDetail) {
      payload.mailError = mailErrorDetail;
    }
    res.json(payload);
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
    if (!user.isEmailVerified) {
      return res.status(403).json({
        message: "Please verify your email before logging in.",
        needsEmailVerification: true
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

router.post("/forgot-password", async (req, res) => {
  const genericMessage = "If the email is registered, a password reset link has been sent.";
  try {
    const email = String(req.body?.email || "").trim().toLowerCase();
    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const user = await User.findOne({ email });
    if (!user || user.authProvider !== "local") {
      return res.json({ message: genericMessage });
    }

    const { rawToken, hashedToken } = createVerificationToken();
    // If user can request reset, allow login flow without separate verify-email step.
    user.isEmailVerified = true;
    user.emailVerificationToken = null;
    user.emailVerificationExpires = null;
    user.passwordResetToken = hashedToken;
    user.passwordResetExpires = new Date(Date.now() + PASSWORD_RESET_TTL_MS);
    await user.save();

    try {
      await sendPasswordResetEmail(user.email, user.username, rawToken);
    } catch (mailError) {
      console.error("Password reset email send failed:", mailError?.message || mailError);
      return res.status(500).json({ message: "Unable to send reset email right now. Please try again later." });
    }

    return res.json({ message: genericMessage });
  } catch (error) {
    return res.status(500).json({ message: "Forgot password request failed" });
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
        googleId: payload.sub,
        isEmailVerified: true
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

router.get("/verify-email", async (req, res) => {
  try {
    const token = String(req.query.token || "").trim();
    if (!token) {
      return res.status(400).send(renderVerifyPage("Verification Failed", "Missing verification token.", false));
    }

    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");
    const user = await User.findOne({
      emailVerificationToken: hashedToken,
      emailVerificationExpires: { $gt: new Date() }
    });

    if (!user) {
      return res.status(400).send(renderVerifyPage("Verification Failed", "Token is invalid or expired.", false));
    }

    user.isEmailVerified = true;
    user.emailVerificationToken = null;
    user.emailVerificationExpires = null;
    await user.save();

    return res.status(200).send(renderVerifyPage("Email Verified", "Your account has been verified successfully.", true));
  } catch (error) {
    return res.status(500).send(renderVerifyPage("Verification Failed", "Server error during verification.", false));
  }
});

router.get("/reset-password", async (req, res) => {
  try {
    const token = String(req.query.token || "").trim();
    if (!token) {
      return res
        .status(400)
        .send(
          renderResetPasswordPage({
            title: "Reset Link Invalid",
            message: "Missing password reset token.",
            isSuccess: false
          })
        );
    }

    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");
    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: new Date() }
    });

    if (!user || user.authProvider !== "local") {
      return res
        .status(400)
        .send(
          renderResetPasswordPage({
            title: "Reset Link Invalid",
            message: "This reset link is invalid or has expired. Request a new one from login.",
            isSuccess: false
          })
        );
    }

    return res
      .status(200)
      .send(
        renderResetPasswordPage({
          title: "Set a New Password",
          message: "Enter your new password below.",
          isSuccess: true,
          showForm: true,
          token
        })
      );
  } catch (error) {
    return res
      .status(500)
      .send(
        renderResetPasswordPage({
          title: "Reset Failed",
          message: "Server error while loading reset page.",
          isSuccess: false
        })
      );
  }
});

router.post("/reset-password", async (req, res) => {
  try {
    const token = String(req.body?.token || "").trim();
    const password = String(req.body?.password || "");

    if (!token || !password) {
      return res.status(400).json({ message: "Token and new password are required" });
    }
    if (password.length < 8) {
      return res.status(400).json({ message: "Password must be at least 8 characters" });
    }

    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");
    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: new Date() }
    });

    if (!user || user.authProvider !== "local") {
      return res.status(400).json({ message: "Reset token is invalid or expired" });
    }

    user.password = await bcrypt.hash(password, 10);
    // Completing reset proves inbox ownership, so treat email as verified.
    user.isEmailVerified = true;
    user.emailVerificationToken = null;
    user.emailVerificationExpires = null;
    user.passwordResetToken = null;
    user.passwordResetExpires = null;
    await user.save();

    return res.json({ message: "Password updated successfully. Please log in with your new password." });
  } catch (error) {
    return res.status(500).json({ message: "Password reset failed" });
  }
});

module.exports = router;
