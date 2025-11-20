const twilio = require('twilio');
const { supabase } = require('../config/supabase');

class TwilioService {
  constructor() {
    this.accountSid = process.env.TWILIO_ACCOUNT_SID;
    this.authToken = process.env.TWILIO_AUTH_TOKEN;
    this.fromNumber = process.env.TWILIO_PHONE_NUMBER;

    if (!this.accountSid || !this.authToken || !this.fromNumber) {
      throw new Error('Missing Twilio credentials in environment variables');
    }

    this.client = twilio(this.accountSid, this.authToken);
    this.callTimeoutSeconds = parseInt(process.env.CALL_TIMEOUT_SECONDS) || 30;
    this.maxLoops = parseInt(process.env.MAX_ESCALATION_LOOPS) || 3;
  }

  /**
   * Start escalation call sequence for an email
   */
  async startEscalation(emailId, phoneNumbers, spokenMessage) {
    try {
      console.log(`Starting escalation for email ${emailId}`);
      console.log(`Phone numbers in chain: ${phoneNumbers.length}`);

      let currentLoop = 1;
      let confirmed = false;

      while (!confirmed && currentLoop <= this.maxLoops) {
        console.log(`\n--- Escalation Loop ${currentLoop}/${this.maxLoops} ---`);

        for (let i = 0; i < phoneNumbers.length; i++) {
          const phoneNumber = phoneNumbers[i];
          console.log(`Calling ${phoneNumber.contact_name} at ${phoneNumber.phone_number}...`);

          const callResult = await this.makeCall(
            emailId,
            phoneNumber,
            spokenMessage,
            i + 1,
            currentLoop
          );

          if (callResult.confirmed) {
            console.log(`✓ Call confirmed by ${phoneNumber.contact_name}`);
            confirmed = true;
            break; // Stop calling other numbers
          }

          console.log(`✗ No confirmation from ${phoneNumber.contact_name}`);

          // Wait a bit before calling next number
          await this.sleep(2000);
        }

        if (!confirmed) {
          currentLoop++;
          if (currentLoop <= this.maxLoops) {
            console.log(`\nNo confirmations in loop ${currentLoop - 1}. Starting loop ${currentLoop}...`);
            await this.sleep(5000); // Wait before starting next loop
          }
        }
      }

      if (confirmed) {
        console.log(`\n✓ Escalation completed successfully`);
        return { success: true, confirmed: true };
      } else {
        console.log(`\n✗ Escalation failed - no confirmations after ${this.maxLoops} loops`);
        return { success: false, confirmed: false };
      }
    } catch (error) {
      console.error('Error in escalation:', error);
      throw error;
    }
  }

  /**
   * Make a single call
   */
  async makeCall(emailId, phoneNumber, spokenMessage, attemptNumber, loopNumber) {
    let callRecord = null;

    try {
      // Create call record in database
      const { data: call, error: dbError } = await supabase
        .from('calls')
        .insert({
          email_id: emailId,
          phone_number_id: phoneNumber.id,
          phone_number: phoneNumber.phone_number,
          contact_name: phoneNumber.contact_name,
          status: 'initiated',
          attempt_number: attemptNumber,
          loop_number: loopNumber
        })
        .select()
        .single();

      if (dbError) throw dbError;
      callRecord = call;

      // Create TwiML for the call
      const twimlUrl = `${process.env.BASE_URL || 'http://localhost:3000'}/api/calls/twiml/${call.id}`;

      // Initiate call via Twilio
      const twilioCall = await this.client.calls.create({
        to: phoneNumber.phone_number,
        from: this.fromNumber,
        url: twimlUrl,
        timeout: this.callTimeoutSeconds,
        statusCallback: `${process.env.BASE_URL || 'http://localhost:3000'}/api/calls/status/${call.id}`,
        statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed']
      });

      // Update call with Twilio SID
      await supabase
        .from('calls')
        .update({
          twilio_call_sid: twilioCall.sid,
          status: 'queued'
        })
        .eq('id', call.id);

      console.log(`Call initiated with SID: ${twilioCall.sid}`);

      // Wait for call to complete and check for confirmation
      const confirmed = await this.waitForCallCompletion(call.id, twilioCall.sid);

      return {
        callId: call.id,
        twilioSid: twilioCall.sid,
        confirmed: confirmed
      };
    } catch (error) {
      console.error(`Error making call to ${phoneNumber.phone_number}:`, error);

      if (callRecord) {
        await supabase
          .from('calls')
          .update({
            status: 'failed',
            error_message: error.message
          })
          .eq('id', callRecord.id);
      }

      return { confirmed: false, error: error.message };
    }
  }

  /**
   * Wait for call to complete and check for confirmation
   */
  async waitForCallCompletion(callId, twilioSid) {
    const maxWaitTime = (this.callTimeoutSeconds + 60) * 1000; // Timeout + buffer
    const pollInterval = 2000; // Check every 2 seconds
    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitTime) {
      // Check call status in database
      const { data: call } = await supabase
        .from('calls')
        .select('*')
        .eq('id', callId)
        .single();

      if (!call) break;

      // Check if call was confirmed
      if (call.confirmed) {
        return true;
      }

      // Check if call ended without confirmation
      if (['completed', 'no-answer', 'busy', 'failed', 'canceled'].includes(call.status)) {
        return false;
      }

      // Wait before polling again
      await this.sleep(pollInterval);
    }

    return false;
  }

  /**
   * Generate TwiML for call
   */
  generateTwiML(spokenMessage, callId) {
    const twiml = new twilio.twiml.VoiceResponse();

    // Gather input (wait for keypress)
    const gather = twiml.gather({
      numDigits: 1,
      timeout: 10,
      action: `/api/calls/gather/${callId}`,
      method: 'POST'
    });

    // Say the message using Amazon Polly voice via Twilio
    gather.say(
      {
        voice: 'Polly.Joanna-Neural',
        language: 'en-US'
      },
      spokenMessage
    );

    // If no input received, say goodbye
    twiml.say(
      {
        voice: 'Polly.Joanna-Neural',
        language: 'en-US'
      },
      'No confirmation received. Goodbye.'
    );

    return twiml.toString();
  }

  /**
   * Handle gather response (keypress)
   */
  async handleGatherResponse(callId, digits) {
    if (digits === '1') {
      // User pressed 1 - confirmed
      await supabase
        .from('calls')
        .update({
          confirmed: true,
          status: 'confirmed'
        })
        .eq('id', callId);

      const twiml = new twilio.twiml.VoiceResponse();
      twiml.say(
        {
          voice: 'Polly.Joanna-Neural',
          language: 'en-US'
        },
        'Thank you for confirming. The alert has been acknowledged.'
      );

      return twiml.toString();
    } else {
      // Invalid input
      const twiml = new twilio.twiml.VoiceResponse();
      twiml.say(
        {
          voice: 'Polly.Joanna-Neural',
          language: 'en-US'
        },
        'Invalid input. Goodbye.'
      );

      return twiml.toString();
    }
  }

  /**
   * Update call status from Twilio webhook
   */
  async updateCallStatus(callId, status, duration = null) {
    const updateData = { status };

    if (duration) {
      updateData.duration = parseInt(duration);
    }

    await supabase
      .from('calls')
      .update(updateData)
      .eq('id', callId);

    console.log(`Updated call ${callId} status to: ${status}`);
  }

  /**
   * Sleep helper
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = new TwilioService();
