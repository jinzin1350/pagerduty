const express = require('express');
const router = express.Router();
const { supabase } = require('../config/supabase');
const { authenticateUser } = require('../middleware/auth');
const twilioService = require('../services/twilioService');
const gmailService = require('../services/gmailService');

/**
 * Get all calls for user's organization
 */
router.get('/', authenticateUser, async (req, res) => {
  try {
    const { organization_id } = req.user;
    const { limit = 100, offset = 0, email_id } = req.query;

    let query = supabase
      .from('calls')
      .select(`
        *,
        emails!inner(organization_id, subject, sender),
        phone_numbers(contact_name, phone_number)
      `, { count: 'exact' })
      .eq('emails.organization_id', organization_id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (email_id) {
      query = query.eq('email_id', email_id);
    }

    const { data: calls, error, count } = await query;

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({
      calls,
      total: count,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    console.error('Get calls error:', error);
    res.status(500).json({ error: 'Failed to fetch calls' });
  }
});

/**
 * TwiML endpoint for Twilio to fetch call instructions
 */
router.post('/twiml/:callId', async (req, res) => {
  try {
    const { callId } = req.params;

    // Get call details
    const { data: call, error } = await supabase
      .from('calls')
      .select('*, emails(*)')
      .eq('id', callId)
      .single();

    if (error || !call) {
      return res.status(404).send('Call not found');
    }

    // Get email data
    const email = call.emails;

    // Create spoken message
    const spokenMessage = gmailService.createSpokenEmail(email);

    // Generate TwiML
    const twiml = twilioService.generateTwiML(spokenMessage, callId);

    res.type('text/xml');
    res.send(twiml);
  } catch (error) {
    console.error('TwiML generation error:', error);
    res.status(500).send('Error generating TwiML');
  }
});

/**
 * Handle gather response (when user presses a key)
 */
router.post('/gather/:callId', async (req, res) => {
  try {
    const { callId } = req.params;
    const { Digits } = req.body;

    console.log(`Received digits ${Digits} for call ${callId}`);

    const twiml = await twilioService.handleGatherResponse(callId, Digits);

    res.type('text/xml');
    res.send(twiml);
  } catch (error) {
    console.error('Gather handling error:', error);
    res.status(500).send('Error handling gather');
  }
});

/**
 * Twilio status callback webhook
 */
router.post('/status/:callId', async (req, res) => {
  try {
    const { callId } = req.params;
    const { CallStatus, CallDuration } = req.body;

    console.log(`Call ${callId} status update: ${CallStatus}`);

    await twilioService.updateCallStatus(callId, CallStatus, CallDuration);

    res.sendStatus(200);
  } catch (error) {
    console.error('Status callback error:', error);
    res.sendStatus(500);
  }
});

module.exports = router;
