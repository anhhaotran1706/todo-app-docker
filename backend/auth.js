const crypto = require('crypto');
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User } = require('./models');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
const APP_URL = process.env.APP_URL || 'http://localhost:8080';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);

function newVerification() {
  return { verifyToken: crypto.randomBytes(32).toString('hex'), verifyExpires: new Date(Date.now() + 24 * 3600 * 1000) };
}
const verifyUrl = (token) => `${APP_URL}/api/auth/verify?token=${token}`;

function createAuthRouter(publish) {
  const router = express.Router();

  router.post('/register', wrap(async (req, res) => {
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');
    if (!EMAIL_RE.test(email)) return res.status(400).json({ error: 'Invalid e-mail address' });
    if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });
    if (await User.findOne({ email })) return res.status(409).json({ error: 'E-mail is already registered' });

    const v = newVerification();
    try {
      await User.create({ email, passwordHash: await bcrypt.hash(password, 10), ...v });
    } catch (err) {
      if (err.code === 11000) return res.status(409).json({ error: 'E-mail is already registered' });
      throw err;
    }
    await publish('user.registered', { email, verifyUrl: verifyUrl(v.verifyToken) });
    res.status(201).json({ message: 'Registered. Please check your e-mail to verify your account.' });
  }));

  router.get('/verify', wrap(async (req, res) => {
    const user = await User.findOne({ verifyToken: String(req.query.token || ''), verifyExpires: { $gt: new Date() } });
    if (!user) return res.redirect('/?verified=0');
    user.verified = true;
    user.verifyToken = undefined;
    user.verifyExpires = undefined;
    await user.save();
    res.redirect('/?verified=1');
  }));

  router.post('/resend', wrap(async (req, res) => {
    const email = String(req.body.email || '').trim().toLowerCase();
    const user = await User.findOne({ email });
    if (user && !user.verified) {
      const v = newVerification();
      user.verifyToken = v.verifyToken;
      user.verifyExpires = v.verifyExpires;
      await user.save();
      await publish('user.registered', { email, verifyUrl: verifyUrl(v.verifyToken) });
    }
    res.json({ message: 'If the account exists and is not verified, a new e-mail has been sent.' });
  }));

  router.post('/login', wrap(async (req, res) => {
    const email = String(req.body.email || '').trim().toLowerCase();
    const user = await User.findOne({ email });
    if (!user || !(await bcrypt.compare(String(req.body.password || ''), user.passwordHash)))
      return res.status(401).json({ error: 'Invalid e-mail or password' });
    const token = jwt.sign({ sub: user.id, email: user.email, verified: user.verified }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, email: user.email, verified: user.verified });
  }));

  return router;
}

function requireAuth(req, res, next) {
  const h = req.headers.authorization || '';
  try {
    req.user = jwt.verify(h.startsWith('Bearer ') ? h.slice(7) : '', JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Unauthorized' });
  }
}

module.exports = { createAuthRouter, requireAuth, wrap };