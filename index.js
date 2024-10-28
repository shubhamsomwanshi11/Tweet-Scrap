const express = require('express');
const { exec } = require('child_process');
const app = express();
const cors = require('cors');
const PORT = process.env.PORT || 9860 ;

// Middleware to parse JSON requests
app.use(express.json());
app.use(cors());

// Endpoint to execute the command
app.post('/api/getTweet', (req, res) => {
    const tweetUrl = req.body.tweetUrl;

    const command = `node tweetAPI.js "${tweetUrl}"`;

    exec(command, (error, stdout, stderr) => {
        if (error) {
            console.error(`Error executing the command: ${error.message}`);
            return res.status(500).json({ error: error.message });
        }

        if (stderr) {
            console.error(`Error: ${stderr}`);
            return res.status(500).json({ error: stderr });
        }

        // Send the JSON output back to the client
        res.json({ tweetData: stdout });
    });
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
