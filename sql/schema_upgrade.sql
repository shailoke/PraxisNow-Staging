-- ============================================
-- PRAXIS SCHEMA UPGRADE - Execute in Supabase SQL Editor
-- ============================================

-- Step 1: Add new columns to scenarios table
ALTER TABLE public.scenarios
ADD COLUMN IF NOT EXISTS persona TEXT,
ADD COLUMN IF NOT EXISTS evaluation_dimensions TEXT[] DEFAULT ARRAY['Architecture','Scale','Leadership'];

-- Step 2: Add new columns to sessions table
ALTER TABLE public.sessions
ADD COLUMN IF NOT EXISTS dimensions_covered JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS confidence_scores JSONB DEFAULT '{}';

-- Step 3: Create messages table for chat history
CREATE TABLE IF NOT EXISTS public.messages (
  id uuid default gen_random_uuid() primary key,
  session_id uuid references public.sessions not null,
  role text not null, -- 'user' or 'assistant'
  content text not null,
  created_at timestamptz default now()
);

-- Step 4: Create transcripts table for audio/text analysis
CREATE TABLE IF NOT EXISTS public.transcripts (
  id uuid default gen_random_uuid() primary key,
  session_id uuid references public.sessions not null,
  audio_url text,
  text_content text,
  sentiment_score float,
  clarity_score float,
  created_at timestamptz default now()
);

-- Step 5: Create purchases table for payment tracking
CREATE TABLE IF NOT EXISTS public.purchases (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.users not null,
  order_id text unique not null,
  amount int not null,
  sessions_added int not null,
  status text not null, -- 'pending', 'completed', 'failed'
  created_at timestamptz default now()
);

-- Step 6: Enable RLS on new tables
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transcripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;

-- Step 7: Create policies for messages
CREATE POLICY "Users can view messages from own sessions" 
  ON public.messages FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.sessions 
      WHERE sessions.id = messages.session_id 
      AND sessions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert messages to own sessions" 
  ON public.messages FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.sessions 
      WHERE sessions.id = messages.session_id 
      AND sessions.user_id = auth.uid()
    )
  );

-- Step 8: Create policies for transcripts
CREATE POLICY "Users can view own transcripts" 
  ON public.transcripts FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.sessions 
      WHERE sessions.id = transcripts.session_id 
      AND sessions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own transcripts" 
  ON public.transcripts FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.sessions 
      WHERE sessions.id = transcripts.session_id 
      AND sessions.user_id = auth.uid()
    )
  );

-- Step 9: Create policies for purchases
CREATE POLICY "Users can view own purchases" 
  ON public.purchases FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own purchases" 
  ON public.purchases FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Step 10: Create trigger to increment sessions on purchase
CREATE OR REPLACE FUNCTION public.increment_sessions() 
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' THEN
    UPDATE public.users 
    SET available_sessions = available_sessions + NEW.sessions_added 
    WHERE id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_purchase_completed
  AFTER INSERT OR UPDATE ON public.purchases
  FOR EACH ROW 
  WHEN (NEW.status = 'completed')
  EXECUTE PROCEDURE public.increment_sessions();

-- Step 11: Seed 5 scenarios with new schema
INSERT INTO public.scenarios (role, level, persona, prompt, evaluation_dimensions)
VALUES
  ('SDE', 'L5', 'Skeptical', 'Design a Twitter-scale system that can handle 500M daily active users. Focus on read-heavy workloads, real-time updates, and global distribution.', ARRAY['Architecture','Scale','Leadership']),
  ('PM', 'L5', 'Neutral', 'Launch a new feature to improve user engagement. Define success metrics, prioritization framework, and execution plan.', ARRAY['Metrics','Prioritization','Execution']),
  ('Data Scientist', 'Mid', 'Encouraging', 'Build a fraud detection model for a fintech platform. Handle class imbalance, feature engineering, and model deployment.', ARRAY['ML Pipeline','Metrics','Edge Cases']),
  ('SDE', 'L4', 'Neutral', 'Design a rate limiter for an API gateway. Consider distributed systems, consistency, and performance.', ARRAY['Architecture','Scale','Design Patterns']),
  ('PM', 'Mid', 'Skeptical', 'Prioritize features for Q1 roadmap with limited engineering resources. Balance technical debt, user needs, and business goals.', ARRAY['Prioritization','Stakeholder Management','Trade-offs'])
ON CONFLICT DO NOTHING;

-- Step 12: Verification queries
-- Run these to verify the upgrade:
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'scenarios';
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'sessions';
-- SELECT COUNT(*) FROM scenarios;
-- SELECT * FROM scenarios LIMIT 5;
