const http = require('http');
const app = require('./app');
const connectDB = require('./config/db');
const env = require('./config/env');
const { initRealtime } = require('./realtime');

(async () => {
  try {
    await connectDB();
    const server = http.createServer(app);
    const io = initRealtime(server);
    app.set('io', io); // controllerlar req.app.get('io') orqali emit qiladi

    server.listen(env.port, () => {
      console.log(`🚀 AvtoEhtiyot API: http://localhost:${env.port}`);
      console.log(`   Rejim: ${env.nodeEnv}`);
      console.log(`   Socket.io: faol (chat)`);
    });
  } catch (err) {
    console.error('❌ Server ishga tushmadi:', err.message);
    process.exit(1);
  }
})();
