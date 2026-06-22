const jwt = require('jsonwebtoken');
const env = require('../config/env');

const signAccess = (payload) =>
  jwt.sign(payload, env.jwt.accessSecret, { expiresIn: env.jwt.accessTtl });
const signRefresh = (payload) =>
  jwt.sign(payload, env.jwt.refreshSecret, { expiresIn: env.jwt.refreshTtl });
const verifyAccess = (token) => jwt.verify(token, env.jwt.accessSecret);
const verifyRefresh = (token) => jwt.verify(token, env.jwt.refreshSecret);

module.exports = { signAccess, signRefresh, verifyAccess, verifyRefresh };
