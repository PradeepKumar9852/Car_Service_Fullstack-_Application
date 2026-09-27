const app = require('./app');
const env = require('./config/env');

const server = app.listen(env.PORT, () => {
  console.log('====================================================');
  console.log(`🚗 Car Service Voice/Chat Agent Backend`);
  console.log(`🏢 Service Center: ${env.SERVICE_CENTER_NAME}`);
  console.log(`🚀 Server running on: http://localhost:${env.PORT}`);
  console.log(`💻 Web Application:   http://localhost:5173`);
  console.log(`📡 API Chat Endpoint: http://localhost:${env.PORT}/api/chat (POST)`);
  console.log(`📚 Knowledge Base:   http://localhost:${env.PORT}/api/knowledge-base`);
  console.log(`🩺 Health Status:     http://localhost:${env.PORT}/api/health`);
  console.log(`🤖 LLM Engine:        ${env.OPENAI_API_KEY ? `OpenAI (${env.OPENAI_MODEL})` : 'Built-in Intelligent Automotive Engine'}`);
  console.log('====================================================');
});

process.on('SIGINT', () => {
  console.log('\nShutting down backend server safely...');
  server.close(() => {
    console.log('Backend server terminated.');
    process.exit(0);
  });
});

