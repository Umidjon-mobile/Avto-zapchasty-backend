const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const env = require('./config/env');
const routes = require('./routes');
const { notFound, errorHandler } = require('./middleware/error');
const { apiLimiter } = require('./middleware/rateLimit');

const app = express();

// Proxy (nginx/Cloudflare) ortida bo'lsa, req.ip haqiqiy mijoz IP'sini qaytaradi
app.set('trust proxy', 1);

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
if (env.isDev) app.use(morgan('dev'));

// Local rasmlar (R2 sozlanmagan bo'lsa)
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

app.get('/health', (req, res) => res.json({ ok: true, ts: Date.now() }));

app.use('/api', apiLimiter, routes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
