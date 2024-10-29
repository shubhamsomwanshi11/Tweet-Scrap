const express = require('express');
const cors = require('cors');
const { Cluster } = require('puppeteer-cluster');

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

// Initialize Puppeteer Cluster
let cluster;
(async () => {
    cluster = await Cluster.launch({
        concurrency: Cluster.CONCURRENCY_CONTEXT,
        maxConcurrency: 2,
        puppeteerOptions: {
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
            timeout: 60000,
        },
    });
})();

// Function to handle retries for page navigation
const navigateWithRetry = async (page, url, retries = 3) => {
    for (let i = 0; i < retries; i++) {
        try {
            await page.goto(url, { waitUntil: 'load', timeout: 60000 });
            console.log(`Navigation successful on attempt ${i + 1}`);
            return;
        } catch (error) {
            console.warn(`Retrying navigation (${i + 1}/${retries}) due to error:`, error.message);
            if (i === retries - 1) throw error; // Re-throw if out of retries
        }
    }
};

// Endpoint to execute the command
app.post('/api/getTweet', async (req, res) => {
    const tweetUrl = req.body.tweetUrl;

    try {
        const extractedData = await cluster.execute(async ({ page }) => {
            await page.setRequestInterception(true);

            page.on('request', (request) => request.continue());

            return new Promise((resolve, reject) => {
                page.on('response', async (response) => {
                    const request = response.request();

                    if (request.method() === 'OPTIONS') return;

                    if ((request.method() === 'GET' || request.method() === 'POST') &&
                        request.url().includes('https://api.x.com/graphql/')
                    ) {
                        try {
                            const tweetAPIResponse = await response.json();
                            resolve(extractFields(tweetAPIResponse));
                        } catch (error) {
                            console.error('Failed to load response body:', error);
                            reject('Failed to load response body');
                        }
                    }
                });

                // Use retry navigation
                navigateWithRetry(page, tweetUrl)
                    .then(() => page.waitForSelector('article'))
                    .catch(reject);
            });
        });

        res.status(200).json(extractedData);
    } catch (error) {
        console.error("Error in scrapeTweetData:", error);
        res.status(500).json({ error: "Failed to retrieve tweet data" });
    }
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});