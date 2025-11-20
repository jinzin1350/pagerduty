const express = require('express');
const router = express.Router();
const { supabase } = require('../config/supabase');
const { authenticateUser } = require('../middleware/auth');

/**
 * Get all emails for user's organization
 */
router.get('/', authenticateUser, async (req, res) => {
  try {
    const { organization_id } = req.user;
    const { limit = 50, offset = 0 } = req.query;

    const { data: emails, error, count } = await supabase
      .from('emails')
      .select('*, calls(*)', { count: 'exact' })
      .eq('organization_id', organization_id)
      .order('received_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({
      emails,
      total: count,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    console.error('Get emails error:', error);
    res.status(500).json({ error: 'Failed to fetch emails' });
  }
});

/**
 * Get single email by ID
 */
router.get('/:id', authenticateUser, async (req, res) => {
  try {
    const { id } = req.params;
    const { organization_id } = req.user;

    const { data: email, error } = await supabase
      .from('emails')
      .select('*, calls(*)')
      .eq('id', id)
      .eq('organization_id', organization_id)
      .single();

    if (error) {
      return res.status(404).json({ error: 'Email not found' });
    }

    res.json(email);
  } catch (error) {
    console.error('Get email error:', error);
    res.status(500).json({ error: 'Failed to fetch email' });
  }
});

module.exports = router;
