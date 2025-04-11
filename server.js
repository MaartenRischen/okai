const express = require('express');
const basicAuth = require('basic-auth');
const app = express();
const port = process.env.PORT || 3000;

// Basic Authentication Middleware
const auth = (req, res, next) => {
  const user = basicAuth(req);

  // Check if user credentials are provided and valid
  // Use environment variables for credentials in production/staging
  const adminUser = process.env.ADMIN_USER || 'PLEASE_SET_ENV_VAR';
  const adminPass = process.env.ADMIN_PASSWORD || 'PLEASE_SET_ENV_VAR';

  if (!user || user.name !== adminUser || user.pass !== adminPass) {
    res.set('WWW-Authenticate', 'Basic realm="Restricted Area"');
    return res.status(401).send('Authentication required.');
  }
  next(); // Proceed if authentication is successful
};

// Apply the middleware to all routes
app.use(auth);

app.get('/', (req, res) => {
  res.send('Hi from OkAi!');
});

app.listen(port, () => {
  console.log(`OkAi app listening on port ${port}`);
}); 