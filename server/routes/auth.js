const express = require('express');
const router = express.Router();
const { supabase, supabaseAnon } = require('../config/supabase');

/**
 * Register new organization and admin user
 */
router.post('/register', async (req, res) => {
  try {
    const { email, password, organizationName, criticalEmail } = req.body;

    if (!email || !password || !organizationName || !criticalEmail) {
      return res.status(400).json({
        error: 'Missing required fields: email, password, organizationName, criticalEmail'
      });
    }

    // Create user in Supabase Auth
    const { data: authData, error: authError } = await supabaseAnon.auth.signUp({
      email,
      password
    });

    if (authError) {
      return res.status(400).json({ error: authError.message });
    }

    const userId = authData.user.id;

    // Create organization
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .insert({
        name: organizationName,
        critical_email: criticalEmail
      })
      .select()
      .single();

    if (orgError) {
      // Rollback: delete the auth user if org creation fails
      await supabaseAnon.auth.admin.deleteUser(userId);
      return res.status(400).json({ error: orgError.message });
    }

    // Create user record
    const { data: user, error: userError } = await supabase
      .from('users')
      .insert({
        id: userId,
        organization_id: org.id,
        email: email,
        role: 'admin'
      })
      .select()
      .single();

    if (userError) {
      // Rollback
      await supabaseAnon.auth.admin.deleteUser(userId);
      await supabase.from('organizations').delete().eq('id', org.id);
      return res.status(400).json({ error: userError.message });
    }

    res.status(201).json({
      message: 'Registration successful',
      user: {
        id: user.id,
        email: user.email,
        role: user.role
      },
      organization: {
        id: org.id,
        name: org.name,
        critical_email: org.critical_email
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

/**
 * Login
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    const { data, error } = await supabaseAnon.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      return res.status(401).json({ error: error.message });
    }

    // Get user details with organization
    const { data: user } = await supabase
      .from('users')
      .select('*, organizations(*)')
      .eq('id', data.user.id)
      .single();

    res.json({
      session: data.session,
      user: user
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

/**
 * Logout
 */
router.post('/logout', async (req, res) => {
  try {
    const { error } = await supabaseAnon.auth.signOut();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Logout failed' });
  }
});

/**
 * Get current user
 */
router.get('/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({ error: 'No authorization header' });
    }

    const token = authHeader.replace('Bearer ', '');

    const { data: { user }, error } = await supabaseAnon.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Get user details
    const { data: userData } = await supabase
      .from('users')
      .select('*, organizations(*)')
      .eq('id', user.id)
      .single();

    res.json({ user: userData });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

module.exports = router;
