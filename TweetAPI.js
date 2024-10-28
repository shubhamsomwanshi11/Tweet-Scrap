const puppeteer = require('puppeteer');

// Function to extract fields from the response data
const extractFields = (data) => {
  const userData = data.data.tweetResult.result.core.user_results.result;
  const tweetData = data.data.tweetResult.result.legacy;

  return {
    name: userData.legacy.name,
    time: tweetData.created_at,
    isVerified: userData.is_blue_verified,
    profile_image_url: userData.legacy.profile_image_url_https,
    media: tweetData.extended_entities.media.map(media => media.media_url_https),
    hashtags: tweetData.entities?.hashtags || [],
    favorite_count: tweetData.favorite_count,
    full_text: tweetData.full_text,
    quote_count: tweetData.quote_count,
    reply_count: tweetData.reply_count,
    retweet_count: tweetData.retweet_count
  };
};


async function scrapeTweetData(tweetUrl) {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  // Enable request interception
  await page.setRequestInterception(true);

  page.on('request', (request) => {
    request.continue(); // Always proceed with the request
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
          const extractedJSON = extractFields(tweetAPIResponse);
          console.log(extractedJSON);

        } catch (error) {
          console.error('Failed to load response body:', error);
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
}

const args = process.argv.slice(2);

if (args.length === 0) {
  console.error('Please provide a tweet URL as a command-line argument.');
  process.exit(1);
}

// Extract the tweet URL from the command-line arguments
const tweetUrl = args[0];

// Scrape the tweet data
scrapeTweetData(tweetUrl);