-- PagerDuty Clone - Database Schema for Supabase
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Organizations table (multi-tenant support)
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  critical_email TEXT UNIQUE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Users table (extends Supabase auth.users)
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  role TEXT DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Phone numbers table (escalation chain)
CREATE TABLE phone_numbers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  phone_number TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  escalation_order INTEGER NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(organization_id, escalation_order)
);

-- Emails table (received critical emails)
CREATE TABLE emails (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  gmail_message_id TEXT UNIQUE NOT NULL,
  sender TEXT NOT NULL,
  subject TEXT NOT NULL,
  body_preview TEXT,
  full_body TEXT,
  received_at TIMESTAMP WITH TIME ZONE NOT NULL,
  processed BOOLEAN DEFAULT false,
  processing_started_at TIMESTAMP WITH TIME ZONE,
  processing_completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Calls table (call attempts and logs)
CREATE TABLE calls (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email_id UUID REFERENCES emails(id) ON DELETE CASCADE,
  phone_number_id UUID REFERENCES phone_numbers(id) ON DELETE SET NULL,
  phone_number TEXT NOT NULL,
  contact_name TEXT,
  twilio_call_sid TEXT,
  status TEXT DEFAULT 'initiated' CHECK (status IN ('initiated', 'queued', 'ringing', 'in-progress', 'answered', 'confirmed', 'no-answer', 'busy', 'failed', 'canceled')),
  attempt_number INTEGER DEFAULT 1,
  loop_number INTEGER DEFAULT 1,
  duration INTEGER,
  confirmed BOOLEAN DEFAULT false,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX idx_users_org ON users(organization_id);
CREATE INDEX idx_phone_numbers_org ON phone_numbers(organization_id);
CREATE INDEX idx_phone_numbers_order ON phone_numbers(organization_id, escalation_order);
CREATE INDEX idx_emails_org ON emails(organization_id);
CREATE INDEX idx_emails_processed ON emails(processed, organization_id);
CREATE INDEX idx_emails_gmail_id ON emails(gmail_message_id);
CREATE INDEX idx_calls_email ON calls(email_id);
CREATE INDEX idx_calls_status ON calls(status);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers
CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_phone_numbers_updated_at BEFORE UPDATE ON phone_numbers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_calls_updated_at BEFORE UPDATE ON calls
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) Policies
-- Enable RLS on all tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE phone_numbers ENABLE ROW LEVEL SECURITY;
ALTER TABLE emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE calls ENABLE ROW LEVEL SECURITY;

-- Organizations policies
CREATE POLICY "Users can view their own organization"
  ON organizations FOR SELECT
  USING (id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Admins can update their organization"
  ON organizations FOR UPDATE
  USING (id IN (
    SELECT organization_id FROM users
    WHERE id = auth.uid() AND role = 'admin'
  ));

-- Users policies
CREATE POLICY "Users can view users in their organization"
  ON users FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM users WHERE id = auth.uid()
  ));

-- Phone numbers policies
CREATE POLICY "Users can view phone numbers in their organization"
  ON phone_numbers FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM users WHERE id = auth.uid()
  ));

CREATE POLICY "Admins can manage phone numbers"
  ON phone_numbers FOR ALL
  USING (organization_id IN (
    SELECT organization_id FROM users
    WHERE id = auth.uid() AND role = 'admin'
  ));

-- Emails policies
CREATE POLICY "Users can view emails in their organization"
  ON emails FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM users WHERE id = auth.uid()
  ));

-- Calls policies
CREATE POLICY "Users can view calls for their organization emails"
  ON calls FOR SELECT
  USING (email_id IN (
    SELECT e.id FROM emails e
    JOIN users u ON e.organization_id = u.organization_id
    WHERE u.id = auth.uid()
  ));

-- Insert sample data (optional - remove in production)
-- INSERT INTO organizations (name, critical_email)
-- VALUES ('Demo Organization', 'alerts@example.com');
