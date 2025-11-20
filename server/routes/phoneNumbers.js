const express = require('express');
const router = express.Router();
const { supabase } = require('../config/supabase');
const { authenticateUser, requireAdmin } = require('../middleware/auth');

/**
 * Get all phone numbers for user's organization
 */
router.get('/', authenticateUser, async (req, res) => {
  try {
    const { organization_id } = req.user;

    const { data: phoneNumbers, error } = await supabase
      .from('phone_numbers')
      .select('*')
      .eq('organization_id', organization_id)
      .order('escalation_order', { ascending: true });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ phoneNumbers });
  } catch (error) {
    console.error('Get phone numbers error:', error);
    res.status(500).json({ error: 'Failed to fetch phone numbers' });
  }
});

/**
 * Add new phone number (admin only)
 */
router.post('/', authenticateUser, requireAdmin, async (req, res) => {
  try {
    const { organization_id } = req.user;
    const { phone_number, contact_name, escalation_order } = req.body;

    if (!phone_number || !contact_name || escalation_order === undefined) {
      return res.status(400).json({
        error: 'Missing required fields: phone_number, contact_name, escalation_order'
      });
    }

    const { data: phoneNumber, error } = await supabase
      .from('phone_numbers')
      .insert({
        organization_id,
        phone_number,
        contact_name,
        escalation_order
      })
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.status(201).json({ phoneNumber });
  } catch (error) {
    console.error('Create phone number error:', error);
    res.status(500).json({ error: 'Failed to create phone number' });
  }
});

/**
 * Update phone number (admin only)
 */
router.put('/:id', authenticateUser, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { organization_id } = req.user;
    const { phone_number, contact_name, escalation_order, is_active } = req.body;

    const updates = {};
    if (phone_number !== undefined) updates.phone_number = phone_number;
    if (contact_name !== undefined) updates.contact_name = contact_name;
    if (escalation_order !== undefined) updates.escalation_order = escalation_order;
    if (is_active !== undefined) updates.is_active = is_active;

    const { data: phoneNumber, error } = await supabase
      .from('phone_numbers')
      .update(updates)
      .eq('id', id)
      .eq('organization_id', organization_id)
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ phoneNumber });
  } catch (error) {
    console.error('Update phone number error:', error);
    res.status(500).json({ error: 'Failed to update phone number' });
  }
});

/**
 * Delete phone number (admin only)
 */
router.delete('/:id', authenticateUser, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { organization_id } = req.user;

    const { error } = await supabase
      .from('phone_numbers')
      .delete()
      .eq('id', id)
      .eq('organization_id', organization_id);

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ message: 'Phone number deleted successfully' });
  } catch (error) {
    console.error('Delete phone number error:', error);
    res.status(500).json({ error: 'Failed to delete phone number' });
  }
});

module.exports = router;
