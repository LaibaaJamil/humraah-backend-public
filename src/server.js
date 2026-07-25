require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const rateLimit = require('express-rate-limit');

const connectDB = require('./config/db');
const errorHandler = require('./middleware/error');

const authRoutes = require('./routes/authRoutes');
const ngoRoutes = require('./routes/ngoRoutes');
const resourceRoutes = require('./routes/resourceRoutes');
const mapRoutes = require('./routes/mapRoutes');
const tenderRoutes = require('./routes/tenderRoutes');
const reportRoutes = require('./routes/reportRoutes');
const referralRoutes = require('./routes/referralRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const adminRoutes = require('./routes/adminRoutes');
const volunteerRoutes = require('./routes/volunteerRoutes');

const app = express();

connectDB();

app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(cors({ origin: '*', credentials: true }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(morgan('dev'));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

const uploadDir = path.join(__dirname, '..', process.env.UPLOAD_DIR || 'uploads');
app.use('/uploads', express.static(uploadDir));

app.get('/', (req, res) => {
  res.json({
    name: 'Hum-Raah API',
    version: '1.0.0',
    status: 'running',
    docs: '/api/health',
  });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api/ngos', ngoRoutes);
app.use('/api/resources', resourceRoutes);
app.use('/api/map', mapRoutes);
app.use('/api/tenders', tenderRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/referrals', referralRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/volunteers', volunteerRoutes);
// NOTE: the old standalone citizen-reports pipeline has been retired.
// Citizen issue reports are now created and verified exclusively through
// the /api/map (MapPin, type=flag) pipeline so there is a single source
// of truth for "pending verification" instead of two parallel systems.

app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

app.use(errorHandler);

const PORT = process.env.PORT || 5000;
const http = require('http');
const { Server } = require('socket.io');

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*"
  }
});

// store io globally
app.set('io', io);

// connection logic
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // user joins their personal room
  socket.on('join', (userId) => {
    socket.join(userId);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected');
  });
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;
const runDecay = require('./jobs/trustDecayJob');
setInterval(() => {
  runDecay();
}, 24 * 60 * 60 * 1000); // 24 hours