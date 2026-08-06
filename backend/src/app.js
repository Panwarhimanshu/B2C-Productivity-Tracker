const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const departmentRoutes = require('./routes/departments');
const reportRoutes = require('./routes/reports');
const targetRoutes = require('./routes/targets');
const notificationRoutes = require('./routes/notifications');
const { errorHandler } = require('./middleware/errorHandler');

const app = express();

// Vercel sits in front as a single reverse proxy hop — trust its X-Forwarded-For
// so express-rate-limit can identify clients instead of throwing on every request.
app.set('trust proxy', 1);

app.use(helmet());
const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:5173')
  .split(',').map((o) => o.trim()).filter(Boolean);

// Vercel exposes the actual deployment host at runtime — trust it automatically so
// preview deployments and the production alias work without manually syncing FRONTEND_URL.
[process.env.VERCEL_URL, process.env.VERCEL_PROJECT_PRODUCTION_URL, process.env.VERCEL_BRANCH_URL]
  .filter(Boolean)
  .forEach((host) => allowedOrigins.push(`https://${host}`));

const isLocalhost = (origin) => /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);

app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);
    if (process.env.NODE_ENV !== 'production' && isLocalhost(origin)) return cb(null, true);
    if (allowedOrigins.some((o) => origin === o || origin.startsWith(o))) return cb(null, true);
    cb(new Error(`CORS: origin not allowed (${origin})`));
  },
  credentials: true,
}));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 200 : 2000,
  message: 'Too many requests from this IP, please try again later.',
});
app.use('/api/', limiter);

app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/targets', targetRoutes);
app.use('/api/notifications', notificationRoutes);

app.get('/api/health', (req, res) => res.json({ status: 'ok', timestamp: new Date() }));

app.use(errorHandler);

module.exports = app;
