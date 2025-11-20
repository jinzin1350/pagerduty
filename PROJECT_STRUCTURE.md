# Project Structure

```
pagerduty-clone/
├── server/                          # Backend (Node.js + Express)
│   ├── config/
│   │   └── supabase.js             # Supabase client configuration
│   ├── database/
│   │   └── schema.sql              # Database schema for Supabase
│   ├── middleware/
│   │   └── auth.js                 # Authentication middleware
│   ├── routes/
│   │   ├── auth.js                 # Auth endpoints (login, register)
│   │   ├── calls.js                # Call logs and Twilio webhooks
│   │   ├── dashboard.js            # Dashboard stats
│   │   ├── emails.js               # Email endpoints
│   │   └── phoneNumbers.js         # Phone number management
│   ├── services/
│   │   ├── emailMonitor.js         # Main email monitoring logic
│   │   ├── gmailService.js         # Gmail API integration
│   │   ├── ttsService.js           # Amazon Polly TTS
│   │   └── twilioService.js        # Twilio calling + escalation
│   ├── utils/
│   │   └── gmail-auth.js           # OAuth token helper
│   └── index.js                    # Express server entry point
│
├── client/                          # Frontend (React + Vite)
│   ├── src/
│   │   ├── components/
│   │   │   ├── Layout.jsx          # App layout with navigation
│   │   │   └── Layout.css
│   │   ├── context/
│   │   │   └── AuthContext.jsx     # Authentication context
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx       # Dashboard page
│   │   │   ├── Dashboard.css
│   │   │   ├── Emails.jsx          # Email history page
│   │   │   ├── Emails.css
│   │   │   ├── PhoneNumbers.jsx    # Phone number management
│   │   │   ├── PhoneNumbers.css
│   │   │   ├── Login.jsx           # Login page
│   │   │   ├── Register.jsx        # Registration page
│   │   │   └── Auth.css
│   │   ├── services/
│   │   │   └── api.js              # Axios API client
│   │   ├── App.jsx                 # Main app component
│   │   ├── main.jsx                # React entry point
│   │   └── index.css               # Global styles
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
│
├── temp/                            # Temporary TTS audio files
├── .env.example                     # Environment variables template
├── .gitignore
├── package.json                     # Root package.json
├── README.md                        # Project documentation
├── SETUP.md                         # Setup instructions
└── PROJECT_STRUCTURE.md             # This file
```

## Key Features by File

### Backend Services

**emailMonitor.js**
- Cron job that runs every 2 minutes
- Fetches unread emails from Gmail
- Triggers call escalation
- Marks emails as processed

**gmailService.js**
- OAuth authentication with Gmail
- Fetch unread emails
- Parse email content
- Mark emails as read
- Create spoken version for TTS

**twilioService.js**
- Initiate phone calls
- Escalation logic (loop through numbers)
- TwiML generation
- Handle user input (Press 1 to confirm)
- Track call status

**ttsService.js**
- Convert text to speech using Amazon Polly
- Support for neural voices
- Clean up temp audio files

### Backend Routes

**auth.js**
- POST /api/auth/register - Register organization
- POST /api/auth/login - Login
- POST /api/auth/logout - Logout
- GET /api/auth/me - Get current user

**emails.js**
- GET /api/emails - List emails
- GET /api/emails/:id - Get email details

**phoneNumbers.js**
- GET /api/phone-numbers - List phone numbers
- POST /api/phone-numbers - Add phone number (admin)
- PUT /api/phone-numbers/:id - Update phone number (admin)
- DELETE /api/phone-numbers/:id - Delete phone number (admin)

**calls.js**
- GET /api/calls - List calls
- POST /api/calls/twiml/:callId - TwiML for Twilio
- POST /api/calls/gather/:callId - Handle keypress
- POST /api/calls/status/:callId - Status webhook

**dashboard.js**
- GET /api/dashboard/stats - Dashboard statistics
- GET /api/dashboard/timeline - Call timeline

### Frontend Pages

**Dashboard.jsx**
- Overview statistics
- Recent emails
- Auto-refresh every 30 seconds

**Emails.jsx**
- Email history with call logs
- Email detail view
- Call status tracking

**PhoneNumbers.jsx**
- Manage escalation chain
- Add/edit/delete phone numbers
- Toggle active status
- Admin-only features

**Login.jsx / Register.jsx**
- User authentication
- Organization creation

## Database Schema

### Tables

1. **organizations** - Multi-tenant organizations
2. **users** - Dashboard users (linked to Supabase Auth)
3. **phone_numbers** - Escalation chain configuration
4. **emails** - Received critical emails
5. **calls** - Call attempts and logs

See `server/database/schema.sql` for complete schema.

## Environment Variables

All environment variables are documented in `.env.example`.

Required services:
- Supabase (database, auth, storage)
- Gmail API (email monitoring)
- Twilio (phone calls)
- Amazon Polly (text-to-speech)

## Workflow

1. **Email arrives** → Gmail account
2. **Cron job** (every 2 min) → Polls Gmail
3. **Email detected** → Stored in database
4. **TTS conversion** → Amazon Polly
5. **Call sequence** → Twilio calls phone numbers
6. **Escalation** → Loops until confirmation
7. **Logging** → All calls tracked in database
8. **Dashboard** → Real-time view of system

## Development

```bash
npm run dev        # Run both frontend and backend
npm run server     # Run only backend
npm run client     # Run only frontend
```

## Production

```bash
npm run build      # Build frontend
npm start          # Start production server
```

## Testing

Send an email to the configured Gmail address and monitor:
1. Backend console logs
2. Database entries
3. Phone calls
4. Dashboard updates
