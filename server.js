// Simple static file server for frontend
const express = require('express');
const path = require('path');

const app = express();
const PORT = 3000;

// Serve static files from the current directory
app.use(express.static(__dirname));

// Serve homepage at root
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'homepage', 'index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`\n🌐 Frontend server running at http://localhost:${PORT}`);
  console.log(`\n📄 Available pages:`);
  console.log(`   - Homepage: http://localhost:${PORT}/`);
  console.log(`   - Login: http://localhost:${PORT}/login.html`);
  console.log(`   - Signup: http://localhost:${PORT}/signup.html`);
  console.log(`   - Pricing: http://localhost:${PORT}/pricing.html`);
  console.log(`   - Products: http://localhost:${PORT}/products.html`);
  console.log(`   - Services: http://localhost:${PORT}/services.html`);
  console.log(`   - About: http://localhost:${PORT}/about.html`);
  console.log(`   - Contact: http://localhost:${PORT}/contact.html`);
  console.log(`   - Test Connection: http://localhost:${PORT}/test-connection.html`);
  console.log(`\n✅ Backend should be running at http://localhost:5000\n`);
});
