const express = require('express');
const router = express.Router();
const { supabase } = require('../config/supabase');
const { authenticateUser } = require('../middleware/auth');

/**
 * Get dashboard statistics
 */
router.get('/stats', authenticateUser, async (req, res) => {
  try {
    const { organization_id } = req.user;

    // Total emails
    const { count: totalEmails } = await supabase
      .from('emails')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organization_id);

    // Emails today
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { count: emailsToday } = await supabase
      .from('emails')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organization_id)
      .gte('received_at', today.toISOString());

    // Total calls
    const { count: totalCalls } = await supabase
      .from('calls')
      .select(`
        *,
        emails!inner(organization_id)
      `, { count: 'exact', head: true })
      .eq('emails.organization_id', organization_id);

    // Confirmed calls
    const { count: confirmedCalls } = await supabase
      .from('calls')
      .select(`
        *,
        emails!inner(organization_id)
      `, { count: 'exact', head: true })
      .eq('emails.organization_id', organization_id)
      .eq('confirmed', true);

    // Active phone numbers
    const { count: activePhoneNumbers } = await supabase
      .from('phone_numbers')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organization_id)
      .eq('is_active', true);

    // Recent emails (last 10)
    const { data: recentEmails } = await supabase
      .from('emails')
      .select('*')
      .eq('organization_id', organization_id)
      .order('received_at', { ascending: false })
      .limit(10);

    // Call success rate
    const successRate = totalCalls > 0
      ? ((confirmedCalls / totalCalls) * 100).toFixed(1)
      : 0;

    res.json({
      stats: {
        totalEmails: totalEmails || 0,
        emailsToday: emailsToday || 0,
        totalCalls: totalCalls || 0,
        confirmedCalls: confirmedCalls || 0,
        activePhoneNumbers: activePhoneNumbers || 0,
        callSuccessRate: parseFloat(successRate)
      },
      recentEmails: recentEmails || []
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard stats' });
  }
});

/**
 * Get call activity timeline (last 7 days)
 */
router.get('/timeline', authenticateUser, async (req, res) => {
  try {
    const { organization_id } = req.user;
    const { days = 7 } = req.query;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    const { data: calls } = await supabase
      .from('calls')
      .select(`
        created_at,
        status,
        confirmed,
        emails!inner(organization_id)
      `)
      .eq('emails.organization_id', organization_id)
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: true });

    // Group by date
    const timeline = {};
    calls?.forEach(call => {
      const date = new Date(call.created_at).toISOString().split('T')[0];
      if (!timeline[date]) {
        timeline[date] = {
          date,
          total: 0,
          confirmed: 0,
          failed: 0
        };
      }
      timeline[date].total++;
      if (call.confirmed) timeline[date].confirmed++;
      if (call.status === 'failed' || call.status === 'no-answer') {
        timeline[date].failed++;
      }
    });

    res.json({
      timeline: Object.values(timeline)
    });
  } catch (error) {
    console.error('Timeline error:', error);
    res.status(500).json({ error: 'Failed to fetch timeline' });
  }
});

/**
 * Toggle organization monitoring status
 */
router.post('/toggle-monitoring', authenticateUser, async (req, res) => {
  try {
    const { organization_id, role } = req.user;

    // Only admins can toggle monitoring
    if (role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can toggle monitoring' });
    }

    // Get current status
    const { data: org } = await supabase
      .from('organizations')
      .select('is_active')
      .eq('id', organization_id)
      .single();

    // Toggle status
    const { data: updatedOrg, error } = await supabase
      .from('organizations')
      .update({ is_active: !org.is_active })
      .eq('id', organization_id)
      .select()
      .single();

    if (error) throw error;

    res.json({
      message: updatedOrg.is_active ? 'Monitoring resumed' : 'Monitoring paused',
      is_active: updatedOrg.is_active
    });
  } catch (error) {
    console.error('Toggle monitoring error:', error);
    res.status(500).json({ error: 'Failed to toggle monitoring' });
  }
});

module.exports = router;
