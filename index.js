const express = require('express');
const cors = require('cors');
const puppeteer = require('puppeteer');

const app = express();
const PORT = process.env.PORT || 9860;

// Middleware to parse JSON requests
app.use(express.json());
app.use(cors());

// Function to extract fields from the tweet API response
const extractFields = (data) => {
    const userData = data.data.tweetResult.result.core.user_results.result;
    const tweetData = data.data.tweetResult.result.legacy;

    return {
        name: userData.legacy.name,
        time: tweetData.created_at,
        isVerified: userData.is_blue_verified,
        profile_image_url: userData.legacy.profile_image_url_https,
        media: tweetData.extended_entities?.media.map(media => media.media_url_https) || [],
        hashtags: tweetData.entities?.hashtags || [],
        favorite_count: tweetData.favorite_count,
        full_text: tweetData.full_text,
        quote_count: tweetData.quote_count,
        reply_count: tweetData.reply_count,
        retweet_count: tweetData.retweet_count
    };
};

// Endpoint to execute the command
app.post('/api/getTweet', async (req, res) => {
    const tweetUrl = req.body.tweetUrl;
    try {
        // Launch Puppeteer with additional arguments for cloud compatibility
        const browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        const page = await browser.newPage();

        await page.setRequestInterception(true);

        page.on('request', (request) => {
            request.continue();
        });

        page.on('response', async (response) => {
            const request = response.request();

            // Skip OPTIONS (preflight) requests
            if (request.method() === 'OPTIONS') {
                return;
            }

            // Handle GET or POST requests
            if (request.method() === 'GET' || request.method() === 'POST') {
                if (request.url().includes('https://api.x.com/graphql/')) {
                    try {
                        // Capture and parse the response body
                        const tweetAPIResponse = await response.json();
                        // Send the extracted JSON data as a response
                        const extractedData = extractFields(tweetAPIResponse);
                        res.status(200).json(extractedData);
                    } catch (error) {
                        console.error('Failed to load response body:', error);
                        return null;
                    }
                }
            }
            return null;
        });

        // Navigate to the tweet page
        await page.goto(tweetUrl, { waitUntil: 'networkidle2' });

        // Wait for the tweet data to be visible (adjust as needed)
        await page.waitForSelector('article');

        // Close the browser after a delay (to ensure all requests finish)
        setTimeout(async () => {
            await browser.close();
        }, 1000); // Adjust delay as needed
    } catch (error) {
        console.error("Error in scrapeTweetData:", error);
        res.status(500).json({ error: "Failed to retrieve tweet data" });
    }
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});