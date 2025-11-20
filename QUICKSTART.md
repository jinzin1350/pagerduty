# Quick Start Guide

Get your PagerDuty Clone up and running in 15 minutes!

## Prerequisites Checklist

- [ ] Node.js installed (v16+)
- [ ] Supabase account created
- [ ] Gmail account with OAuth credentials
- [ ] Twilio account with phone number
- [ ] AWS account with IAM user

## Installation Steps

### 1. Install Dependencies (2 minutes)

```bash
npm install
cd client && npm install && cd ..
```

### 2. Set Up Supabase (3 minutes)

1. Create project at [supabase.com](https://supabase.com)
2. Copy Project URL and API keys
3. Run `server/database/schema.sql` in SQL Editor

### 3. Configure Gmail API (5 minutes)

1. Enable Gmail API in Google Cloud Console
2. Create OAuth 2.0 credentials
3. Add credentials to `.env`
4. Run: `node server/utils/gmail-auth.js`
5. Copy refresh token to `.env`

### 4. Set Up Twilio (2 minutes)

1. Get Account SID, Auth Token, and Phone Number from Twilio
2. Add to `.env`

### 5. Configure AWS Polly (2 minutes)

1. Create IAM user with Polly access
2. Add credentials to `.env`

### 6. Create `.env` File (1 minute)

```bash
cp .env.example .env
```

Fill in all the credentials you gathered above.

## Run the App

```bash
npm run dev
```

Visit: http://localhost:5173

## First Use

1. **Register** your organization
2. **Add phone numbers** in escalation order
3. **Send a test email** to your Gmail
4. **Wait 2 minutes** for the system to detect it
5. **Answer the call** and press 1 to confirm!

## Testing

Send an email to the Gmail address you configured:

```
To: your-critical-email@gmail.com
Subject: Test Alert
Body: This is a test critical email
```

Within 2 minutes:
- Email appears in dashboard
- System calls first phone number
- If no answer after 30s, calls next number
- Loops until someone presses 1

## Configuration

### Change Poll Interval

In `.env`:
```env
EMAIL_POLL_INTERVAL_MINUTES=2  # Change to 1, 5, 10, etc.
```

### Change Call Timeout

```env
CALL_TIMEOUT_SECONDS=30  # Change to 15, 45, 60, etc.
```

### Max Escalation Loops

```env
MAX_ESCALATION_LOOPS=3  # How many times to loop through all numbers
```

## Troubleshooting

**No emails detected?**
- Check Gmail OAuth token is valid
- Verify Gmail API is enabled
- Check backend console logs

**Calls not working?**
- Verify Twilio credentials
- Check phone number format (+1234567890)
- Review Twilio console for errors

**Database errors?**
- Verify Supabase URL and keys
- Check if schema was applied
- Review Supabase logs

## Next Steps

- Configure email filters (modify `emailMonitor.js`)
- Customize TTS voice (change `AWS_POLLY_VOICE_ID`)
- Add more phone numbers
- Set up monitoring and alerts

## Need Help?

See detailed instructions in:
- `SETUP.md` - Complete setup guide
- `README.md` - Full documentation
- `PROJECT_STRUCTURE.md` - Code overview

## Deploy to Production

### Replit:
1. Create new Replit project
2. Upload code
3. Add Secrets (environment variables)
4. Update `BASE_URL` in `.env`
5. Run `npm start`

### Other Platforms:
- Set environment variables
- Run `npm run build`
- Start with `npm start`
- Ensure cron job runs (or use external cron service)

---

**Enjoy your critical email alert system!**
