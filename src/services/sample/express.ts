import express from 'express';
import { LoggingWinston } from '@google-cloud/logging-winston';
import winston from 'winston';

const app = express();
const port = process.env.PORT || 8080;

const logger = winston.createLogger({
  level: 'info',
  transports: [
    new LoggingWinston(),
    new winston.transports.Console({
      format: winston.format.simple(),
    }),
  ],
});

// Route to print environment variables in JSON
app.get('/env', (req, res) => {
  logger.info('Request made to /env route');
  res.json(process.env);
});

app.get('/crash', (req, res) => {
  throw new Error('Intentional crash for testing error logging!');
});

// Basic Health check route
app.get('/health', (req, res) => {
  res.send('Healthy');
});

app.get('/connectivity', async (req, res) => {
  const urls = [
    'https://networkcheck.kde.org/',
    'https://nmcheck.gnome.org/check_network_status.txt',
    'http://www.msftconnecttest.com/connecttest.txt',
    'http://www.msftncsi.com/ncsi.txt',
    'http://clients3.google.com/generate_204',
    'http://connectivitycheck.gstatic.com/generate_204',
    'https://www.apple.com/library/test/success.html',
    'https://captive.apple.com/hotspot-detect.html',
  ];

  const url = urls[Math.floor(Math.random() * urls.length)];

  try {
    const response = await fetch(url);
    const headers = [...response.headers.entries()]
      .map(([key, value]) => `${key}: ${value}`)
      .join('\n');
    const body = await response.text();

    res.send(`URL: ${url}\nHeaders:\n${headers}\nResponse:\n${body}`);
  } catch (error: any) {
    res
      .status(500)
      .send({ error: `Failed to fetch from the URL: ${error.message}` });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
