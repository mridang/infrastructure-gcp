/**
 * Serves the example Express application that is deployed to Cloud Run.
 * @file
 */

import express from 'express';
import { LoggingWinston } from '@google-cloud/logging-winston';
import winston from 'winston';
import { randomInt } from 'node:crypto';

// eslint-disable-next-line sonarjs/x-powered-by -- demo service keeps Express's default response header
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
app.get('/env', (_req, res) => {
  logger.info('Request made to /env route');
  res.json(process.env);
});

app.get('/crash', () => {
  throw new Error('Intentional crash for testing error logging!');
});

// Basic Health check route
app.get('/health', (_req, res) => {
  res.send('Healthy');
});

app.get('/connectivity', async (_req, res) => {
  const urls = [
    'https://networkcheck.kde.org/',
    'https://nmcheck.gnome.org/check_network_status.txt',
    // eslint-disable-next-line sonarjs/no-clear-text-protocols, unicorn/prefer-https -- captive-portal probes are plain HTTP by design
    'http://www.msftconnecttest.com/connecttest.txt',
    // eslint-disable-next-line sonarjs/no-clear-text-protocols, unicorn/prefer-https -- captive-portal probes are plain HTTP by design
    'http://www.msftncsi.com/ncsi.txt',
    // eslint-disable-next-line sonarjs/no-clear-text-protocols, unicorn/prefer-https -- captive-portal probes are plain HTTP by design
    'http://clients3.google.com/generate_204',
    // eslint-disable-next-line sonarjs/no-clear-text-protocols, unicorn/prefer-https -- captive-portal probes are plain HTTP by design
    'http://connectivitycheck.gstatic.com/generate_204',
    'https://www.apple.com/library/test/success.html',
    'https://captive.apple.com/hotspot-detect.html',
  ];

  const url = urls[randomInt(urls.length)];

  try {
    // eslint-disable-next-line n/no-unsupported-features/node-builtins -- the container runs Node 22, where fetch is stable
    const response = await fetch(url);
    const headers = [...response.headers.entries()]
      .map(([key, value]) => `${key}: ${value}`)
      .join('\n');
    const body = await response.text();

    res.send(`URL: ${url}\nHeaders:\n${headers}\nResponse:\n${body}`);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).send({ error: `Failed to fetch from the URL: ${message}` });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
