/**
 * Helper script to generate Gmail OAuth refresh token
 * Run this once to get your refresh token: node server/utils/gmail-auth.js
 */

const { google } = require('googleapis');
const readline = require('readline');

const oauth2Client = new google.auth.OAuth2(
  process.env.GMAIL_CLIENT_ID,
  process.env.GMAIL_CLIENT_SECRET,
  process.env.GMAIL_REDIRECT_URI || 'http://localhost:3000/oauth2callback'
);

const SCOPES = ['https://www.googleapis.com/auth/gmail.readonly', 'https://www.googleapis.com/auth/gmail.modify'];

/**
 * Get authorization URL
 */
function getAuthUrl() {
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent'
  });

  return authUrl;
}

/**
 * Get refresh token from authorization code
 */
async function getRefreshToken(code) {
  try {
    const { tokens } = await oauth2Client.getToken(code);
    return tokens;
  } catch (error) {
    console.error('Error retrieving access token:', error);
    throw error;
  }
}

/**
 * Main function
 */
async function main() {
  console.log('\n=== Gmail OAuth Setup ===\n');

  if (!process.env.GMAIL_CLIENT_ID || !process.env.GMAIL_CLIENT_SECRET) {
    console.error('Error: GMAIL_CLIENT_ID and GMAIL_CLIENT_SECRET must be set in .env file');
    process.exit(1);
  }

  const authUrl = getAuthUrl();

  console.log('1. Visit this URL to authorize the application:\n');
  console.log(authUrl);
  console.log('\n2. After authorization, you will be redirected to a URL.');
  console.log('3. Copy the "code" parameter from the URL and paste it below.\n');

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  rl.question('Enter the authorization code: ', async (code) => {
    try {
      const tokens = await getRefreshToken(code);

      console.log('\n=== Success! ===\n');
      console.log('Add this to your .env file:\n');
      console.log(`GMAIL_REFRESH_TOKEN=${tokens.refresh_token}`);
      console.log('\nYou can also use this access token (expires in 1 hour):');
      console.log(`Access Token: ${tokens.access_token}`);
      console.log('\n');
    } catch (error) {
      console.error('Error getting tokens:', error.message);
    } finally {
      rl.close();
    }
  });
}

if (require.main === module) {
  require('dotenv').config();
  main();
}

module.exports = { getAuthUrl, getRefreshToken };
