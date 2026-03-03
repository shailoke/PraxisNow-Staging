-- Add phone number column to users table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS phone text;

-- (Optional) If we wanted to enforce structure we could add a check constraint, 
-- but simpler to handle validation on frontend for now to avoid migration headaches.
