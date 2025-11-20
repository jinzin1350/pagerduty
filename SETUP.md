# Setup Guide

Complete step-by-step guide to set up your PagerDuty Clone application.

## Prerequisites

- Node.js (v16 or higher)
- Supabase account
- Gmail account with API access
- Twilio account with phone number
- AWS account with Polly access

## Step 1: Clone and Install Dependencies

```bash
# Install backend dependencies
npm install

# Install frontend dependencies
cd client
npm install
cd ..
```

## Step 2: Set Up Supabase

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Wait for the database to be ready
3. Go to **Project Settings > API**
4. Copy your:
   - Project URL
   - `anon` public key
   - `service_role` secret key

5. Go to **SQL Editor** and run the schema:
   ```bash
   # Copy the contents of server/database/schema.sql
   # Paste and execute in Supabase SQL Editor
   ```

## Step 3: Configure Gmail API

### Get OAuth Credentials:

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select existing one
3. Enable **Gmail API**:
   - Go to **APIs & Services > Library**
   - Search for "Gmail API"
   - Click **Enable**

4. Create OAuth 2.0 credentials:
   - Go to **APIs & Services > Credentials**
   - Click **Create Credentials > OAuth 2.0 Client ID**
   - Application type: **Web application**
   - Add authorized redirect URI: `http://localhost:3000/oauth2callback`
   - Click **Create**
   - Copy **Client ID** and **Client Secret**

### Get Refresh Token:

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Add your Gmail OAuth credentials to `.env`:
   ```env
   GMAIL_CLIENT_ID=your_client_id_here
   GMAIL_CLIENT_SECRET=your_client_secret_here
   GMAIL_REDIRECT_URI=http://localhost:3000/oauth2callback
   ```

3. Run the Gmail auth helper:
   ```bash
   node server/utils/gmail-auth.js
   ```

4. Follow the instructions:
   - Visit the provided URL
   - Authorize the application
   - Copy the `code` from the redirect URL
   - Paste it in the terminal
   - Copy the refresh token to your `.env` file

## Step 4: Set Up Twilio

1. Go to [twilio.com](https://www.twilio.com) and create an account
2. Get a phone number (you may need to upgrade to a paid account)
3. Go to **Console Dashboard**
4. Copy your:
   - Account SID
   - Auth Token
   - Phone Number

5. Add to `.env`:
   ```env
   TWILIO_ACCOUNT_SID=your_account_sid
   TWILIO_AUTH_TOKEN=your_auth_token
   TWILIO_PHONE_NUMBER=+1234567890
   ```

## Step 5: Set Up AWS Polly

1. Go to [AWS Console](https://console.aws.amazon.com)
2. Create an IAM user with Polly permissions:
   - Go to **IAM > Users > Add User**
   - Enable **Programmatic access**
   - Attach policy: `AmazonPollyFullAccess`
   - Create user and download credentials

3. Add to `.env`:
   ```env
   AWS_ACCESS_KEY_ID=your_access_key
   AWS_SECRET_ACCESS_KEY=your_secret_key
   AWS_REGION=us-east-1
   AWS_POLLY_VOICE_ID=Joanna
   ```

## Step 6: Complete Environment Configuration

Edit your `.env` file with all the credentials:

```env
# Server
PORT=3000
NODE_ENV=development
BASE_URL=http://localhost:3000

# Supabase
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_KEY=your_service_key

# Gmail
GMAIL_CLIENT_ID=your_client_id
GMAIL_CLIENT_SECRET=your_client_secret
GMAIL_REDIRECT_URI=http://localhost:3000/oauth2callback
GMAIL_REFRESH_TOKEN=your_refresh_token

# Twilio
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+1234567890

# AWS Polly
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_REGION=us-east-1
AWS_POLLY_VOICE_ID=Joanna

# Settings
CALL_TIMEOUT_SECONDS=30
EMAIL_POLL_INTERVAL_MINUTES=2
MAX_ESCALATION_LOOPS=3
```

## Step 7: Run the Application

### Development Mode:

```bash
# Run both frontend and backend
npm run dev

# Or run separately:
# Backend: npm run server
# Frontend: npm run client
```

### Production Mode:

```bash
# Build frontend
npm run build

# Start server
npm start
```

The application will be available at:
- Frontend: http://localhost:5173 (dev) or http://localhost:3000 (prod)
- Backend API: http://localhost:3000/api

## Step 8: Register and Configure

1. Open the application in your browser
2. Click **Register**
3. Fill in:
   - Organization Name
   - Critical Email to Monitor (your Gmail address)
   - Your email and password
4. Login with your credentials
5. Go to **Phone Numbers** and add your escalation chain
6. The system will start monitoring emails automatically!

## Testing the System

### Test Email Monitoring:

1. Send an email to the Gmail address you configured
2. Wait up to 2 minutes for the poll cycle
3. The system should detect the email and start calling

### Test Phone Calls:

1. Make sure you have at least one phone number configured
2. Send a test email
3. You should receive a call
4. Press **1** to confirm receipt

## Troubleshooting

### Gmail Not Working:

- Verify OAuth credentials are correct
- Check refresh token is valid
- Ensure Gmail API is enabled in Google Cloud Console
- Check console logs for Gmail errors

### Twilio Not Working:

- Verify Account SID and Auth Token
- Check phone number format (+1234567890)
- Ensure you have a verified/paid Twilio account
- Check Twilio console for call logs

### Database Errors:

- Verify Supabase credentials
- Check if schema was applied correctly
- Review Row Level Security policies

### Amazon Polly Errors:

- Verify AWS credentials
- Check IAM user has Polly permissions
- Ensure region is correct

## Deployment to Replit

1. Create a new Replit project
2. Upload all files
3. Add environment variables in Replit Secrets
4. Update `BASE_URL` to your Replit URL
5. Run `npm run install-all`
6. Start the app with `npm start`

## Support

For issues and questions, check the README.md or create an issue in the repository.
