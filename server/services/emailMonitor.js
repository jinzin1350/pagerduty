const { supabase } = require('../config/supabase');
const gmailService = require('./gmailService');
const twilioService = require('./twilioService');

/**
 * Main email monitoring function
 * Called by cron job every 2 minutes
 */
async function startEmailMonitoring() {
  try {
    console.log('=== Email Monitoring Check Started ===');

    // Fetch new unread emails from Gmail
    const emails = await gmailService.getUnreadEmails();

    if (emails.length === 0) {
      console.log('No new emails found.');
      return;
    }

    console.log(`Found ${emails.length} new email(s)`);

    // Process each email
    for (const email of emails) {
      await processEmail(email);
    }

    console.log('=== Email Monitoring Check Completed ===\n');
  } catch (error) {
    console.error('Email monitoring error:', error);
  }
}

/**
 * Process a single email
 */
async function processEmail(emailData) {
  try {
    console.log(`\nProcessing email: "${emailData.subject}"`);

    // Check if email already exists in database
    const { data: existingEmail } = await supabase
      .from('emails')
      .select('id')
      .eq('gmail_message_id', emailData.gmailMessageId)
      .single();

    if (existingEmail) {
      console.log('Email already processed, skipping...');
      return;
    }

    // Get all active organizations (in multi-tenant setup)
    // For now, we'll process for all organizations
    // In production, you'd match the email recipient to the organization
    const { data: organizations, error: orgError } = await supabase
      .from('organizations')
      .select('*')
      .eq('is_active', true);

    if (orgError || !organizations || organizations.length === 0) {
      console.log('No active organizations found');
      return;
    }

    // Process for each organization
    // In real scenario, you'd determine which organization this email belongs to
    // For now, we'll use the first organization
    const organization = organizations[0];

    console.log(`Processing for organization: ${organization.name}`);

    // Store email in database
    const { data: savedEmail, error: emailError } = await supabase
      .from('emails')
      .insert({
        organization_id: organization.id,
        gmail_message_id: emailData.gmailMessageId,
        sender: emailData.sender,
        subject: emailData.subject,
        body_preview: emailData.bodyPreview,
        full_body: emailData.fullBody,
        received_at: emailData.receivedAt,
        processed: false,
        processing_started_at: new Date().toISOString()
      })
      .select()
      .single();

    if (emailError) {
      console.error('Error saving email:', emailError);
      return;
    }

    console.log(`Email saved to database with ID: ${savedEmail.id}`);

    // Get escalation phone numbers for this organization
    const { data: phoneNumbers, error: phoneError } = await supabase
      .from('phone_numbers')
      .select('*')
      .eq('organization_id', organization.id)
      .eq('is_active', true)
      .order('escalation_order', { ascending: true });

    if (phoneError || !phoneNumbers || phoneNumbers.length === 0) {
      console.log('No active phone numbers configured for this organization');
      await markEmailAsProcessed(savedEmail.id, false);
      return;
    }

    console.log(`Found ${phoneNumbers.length} phone number(s) in escalation chain`);

    // Create spoken message for TTS
    const spokenMessage = gmailService.createSpokenEmail(emailData);

    // Start escalation call sequence
    const escalationResult = await twilioService.startEscalation(
      savedEmail.id,
      phoneNumbers,
      spokenMessage
    );

    // Mark email as processed
    await markEmailAsProcessed(savedEmail.id, escalationResult.confirmed);

    // Mark email as read in Gmail
    await gmailService.markAsRead(emailData.gmailMessageId);

    console.log(`✓ Email processing completed`);
  } catch (error) {
    console.error('Error processing email:', error);
  }
}

/**
 * Mark email as processed in database
 */
async function markEmailAsProcessed(emailId, confirmed) {
  await supabase
    .from('emails')
    .update({
      processed: true,
      processing_completed_at: new Date().toISOString()
    })
    .eq('id', emailId);

  console.log(`Email ${emailId} marked as processed (confirmed: ${confirmed})`);
}

module.exports = { startEmailMonitoring, processEmail };
