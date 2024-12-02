import express from 'express';
import {LoggingWinston} from "@google-cloud/logging-winston";
import winston from "winston";

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

// Start the server
app.listen(port, () => {
	console.log(`Server is running on port ${port}`);
});
