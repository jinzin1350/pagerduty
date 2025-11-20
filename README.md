# PagerDuty Clone - Critical Email Alert System

A production-ready application that monitors critical emails and escalates them via automated phone calls with text-to-speech notifications.

## Features

- **Gmail Integration**: Monitors a dedicated Gmail account for critical emails
- **Automated Phone Calls**: Uses Twilio to call configured phone numbers
- **Text-to-Speech**: Amazon Polly converts email content to natural speech
- **Smart Escalation**: Calls numbers in sequence until someone confirms receipt
- **Multi-tenant**: Supports multiple organizations with separate configurations
- **Real-time Dashboard**: React frontend for monitoring and configuration

## Tech Stack

- **Backend**: Node.js + Express
- **Frontend**: React + Vite
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Email**: Gmail API
- **Phone**: Twilio
- **TTS**: Amazon Polly
- **Hosting**: Replit

## Architecture

```
Gmail → Backend (Poll every 2 min) → Process Email → Amazon Polly (TTS)
  → Twilio (Escalate Calls) → Supabase (Store Logs) → React Dashboard
```

## Setup Instructions

### 1. Clone and Install

```bash
npm run install-all
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env` and fill in your credentials:

```bash
cp .env.example .env
```

### 3. Set up Supabase

Run the SQL schema in `server/database/schema.sql` in your Supabase SQL editor.

### 4. Configure Gmail API

1. Go to Google Cloud Console
2. Enable Gmail API
3. Create OAuth 2.0 credentials
4. Add your credentials to `.env`
5. Run the auth helper to get refresh token:
   ```bash
   node server/utils/gmail-auth.js
   ```

### 5. Configure Twilio

1. Sign up for Twilio
2. Get a phone number
3. Add credentials to `.env`

### 6. Configure AWS Polly

1. Create IAM user with Polly permissions
2. Add credentials to `.env`

### 7. Run the Application

Development mode:
```bash
npm run dev
```

Production mode:
```bash
npm start
```

## How It Works

### Email Monitoring
- Polls Gmail every 2 minutes for new emails
- Extracts subject and first few lines
- Stores in database and triggers call sequence

### Call Escalation
1. Calls first phone number
2. Reads email summary using TTS
3. Waits 30 seconds for answer
4. If answered: "Press 1 to confirm receipt"
5. If confirmed: Stop calling
6. If no answer: Move to next number
7. If all numbers exhausted: Loop back to first
8. Continues until someone confirms or max loops reached

### Dashboard
- View email history
- See call logs and status
- Manage phone numbers
- Configure escalation order

## Database Schema

- **organizations**: Multi-tenant support
- **users**: Dashboard users with auth
- **phone_numbers**: Escalation chain configuration
- **emails**: Received critical emails
- **calls**: Call attempts and confirmations

## API Endpoints

```
POST   /api/auth/register          - Register new organization
POST   /api/auth/login             - Login
GET    /api/emails                 - Get email history
GET    /api/calls                  - Get call logs
POST   /api/phone-numbers          - Add phone number
PUT    /api/phone-numbers/:id      - Update phone number
DELETE /api/phone-numbers/:id      - Remove phone number
GET    /api/dashboard/stats        - Get dashboard statistics
```

## Environment Variables

See `.env.example` for full list of required environment variables.

## Contributing

This is a custom internal tool. Contributions are welcome via pull requests.

## License

MIT