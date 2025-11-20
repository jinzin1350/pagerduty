const { google } = require('googleapis');

class GmailService {
  constructor() {
    this.oauth2Client = new google.auth.OAuth2(
      process.env.GMAIL_CLIENT_ID,
      process.env.GMAIL_CLIENT_SECRET,
      process.env.GMAIL_REDIRECT_URI
    );

    // Set credentials with refresh token
    this.oauth2Client.setCredentials({
      refresh_token: process.env.GMAIL_REFRESH_TOKEN
    });

    this.gmail = google.gmail({ version: 'v1', auth: this.oauth2Client });
  }

  /**
   * Get unread emails from inbox
   */
  async getUnreadEmails() {
    try {
      // Search for unread emails
      const response = await this.gmail.users.messages.list({
        userId: 'me',
        q: 'is:unread',
        maxResults: 10
      });

      const messages = response.data.messages || [];

      if (messages.length === 0) {
        return [];
      }

      // Fetch full details for each message
      const emailPromises = messages.map(msg =>
        this.getEmailDetails(msg.id)
      );

      const emails = await Promise.all(emailPromises);
      return emails.filter(email => email !== null);
    } catch (error) {
      console.error('Error fetching emails from Gmail:', error);
      throw error;
    }
  }

  /**
   * Get email details by message ID
   */
  async getEmailDetails(messageId) {
    try {
      const response = await this.gmail.users.messages.get({
        userId: 'me',
        id: messageId,
        format: 'full'
      });

      const message = response.data;
      const headers = message.payload.headers;

      // Extract headers
      const subject = this.getHeader(headers, 'Subject') || '(No Subject)';
      const from = this.getHeader(headers, 'From') || '(Unknown Sender)';
      const date = this.getHeader(headers, 'Date') || new Date().toISOString();

      // Extract body
      const body = this.extractBody(message.payload);
      const bodyPreview = this.createPreview(body, 500);

      return {
        gmailMessageId: message.id,
        sender: from,
        subject: subject,
        bodyPreview: bodyPreview,
        fullBody: body,
        receivedAt: new Date(date)
      };
    } catch (error) {
      console.error(`Error fetching email details for ${messageId}:`, error);
      return null;
    }
  }

  /**
   * Mark email as read
   */
  async markAsRead(messageId) {
    try {
      await this.gmail.users.messages.modify({
        userId: 'me',
        id: messageId,
        requestBody: {
          removeLabelIds: ['UNREAD']
        }
      });
      console.log(`Marked email ${messageId} as read`);
    } catch (error) {
      console.error(`Error marking email ${messageId} as read:`, error);
    }
  }

  /**
   * Get header value from headers array
   */
  getHeader(headers, name) {
    const header = headers.find(h => h.name.toLowerCase() === name.toLowerCase());
    return header ? header.value : null;
  }

  /**
   * Extract email body from payload
   */
  extractBody(payload) {
    let body = '';

    if (payload.parts) {
      // Multipart message
      for (const part of payload.parts) {
        if (part.mimeType === 'text/plain' && part.body.data) {
          body += this.decodeBase64(part.body.data);
        } else if (part.mimeType === 'text/html' && !body && part.body.data) {
          // Fallback to HTML if no plain text
          body += this.stripHtml(this.decodeBase64(part.body.data));
        } else if (part.parts) {
          // Nested parts
          body += this.extractBody(part);
        }
      }
    } else if (payload.body.data) {
      // Single part message
      body = this.decodeBase64(payload.body.data);
      if (payload.mimeType === 'text/html') {
        body = this.stripHtml(body);
      }
    }

    return body.trim();
  }

  /**
   * Decode base64 URL-safe string
   */
  decodeBase64(data) {
    try {
      return Buffer.from(data, 'base64url').toString('utf-8');
    } catch (error) {
      console.error('Error decoding base64:', error);
      return '';
    }
  }

  /**
   * Strip HTML tags from text
   */
  stripHtml(html) {
    return html
      .replace(/<style[^>]*>.*?<\/style>/gi, '')
      .replace(/<script[^>]*>.*?<\/script>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Create preview text (first N characters)
   */
  createPreview(text, maxLength = 500) {
    if (!text) return '';

    const cleaned = text.replace(/\s+/g, ' ').trim();

    if (cleaned.length <= maxLength) {
      return cleaned;
    }

    return cleaned.substring(0, maxLength) + '...';
  }

  /**
   * Create spoken version of email for TTS
   */
  createSpokenEmail(email) {
    const sender = email.sender.replace(/<.*?>/, '').trim();
    const subject = email.subject;
    const preview = email.bodyPreview;

    return `
      Critical Email Alert.
      From: ${sender}.
      Subject: ${subject}.
      Message: ${preview}.
      Press 1 to confirm you have received this alert.
    `.replace(/\s+/g, ' ').trim();
  }
}

module.exports = new GmailService();
