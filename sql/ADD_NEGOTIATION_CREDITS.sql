-- Add negotiation_credits column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS negotiation_credits INT DEFAULT 0;

-- Update RLS if necessary (though usually 'users' RLS handles all columns, verified in previous contexts)
-- For completeness, if we had specific column policies, we'd add them, but standard 'users' policies usually cover row access.
