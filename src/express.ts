import express from 'express';

const app = express();
const port = process.env.PORT || 8080;

// Route to print environment variables in JSON
app.get('/env', (req, res) => {
	res.json(process.env);
});

// Basic Health check route
app.get('/health', (req, res) => {
	res.send('Healthy');
});

// Start the server
app.listen(port, () => {
	console.log(`Server is running on port ${port}`);
});
