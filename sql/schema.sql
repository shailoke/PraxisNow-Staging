-- ============================================
-- PRAXIS COMPLETE DATABASE SCHEMA
-- ============================================

-- Table: users
CREATE TABLE public.users (
  id uuid REFERENCES auth.users NOT NULL PRIMARY KEY,
  email text UNIQUE,
  full_name text,
  avatar_url text,
  available_sessions int DEFAULT 1,
  created_at timestamptz DEFAULT now()
);

-- Table: scenarios
CREATE TABLE public.scenarios (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  role text NOT NULL, -- 'SDE', 'PM', 'Data Scientist', etc.
  level text NOT NULL, -- 'Junior', 'Mid', 'Senior', 'L4', 'L5', etc.
  persona text, -- 'Skeptical', 'Neutral', 'Encouraging'
  prompt text NOT NULL, -- The interview scenario description
  evaluation_dimensions text[] DEFAULT ARRAY['Architecture','Scale','Leadership'], -- Dimensions to evaluate
  created_at timestamptz DEFAULT now()
);

-- Table: sessions
CREATE TABLE public.sessions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.users NOT NULL,
  scenario_id uuid REFERENCES public.scenarios NOT NULL,
  transcript jsonb, -- Legacy: Full conversation transcript
  confidence_score float, -- Legacy: Overall confidence score
  dimensions_covered jsonb DEFAULT '{}', -- NEW: {"Architecture": true, "Scale": false}
  confidence_scores jsonb DEFAULT '{}', -- NEW: {"Architecture": 7.2, "Scale": 6.8}
  duration_seconds int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Table: messages (NEW)
CREATE TABLE public.messages (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id uuid REFERENCES public.sessions NOT NULL,
  role text NOT NULL, -- 'user' or 'assistant'
  content text NOT NULL, -- Message content
  created_at timestamptz DEFAULT now()
);

-- Table: transcripts (NEW)
CREATE TABLE public.transcripts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id uuid REFERENCES public.sessions NOT NULL,
  audio_url text, -- URL to audio recording
  text_content text, -- Transcribed text
  sentiment_score float, -- Sentiment analysis score
  clarity_score float, -- Clarity/coherence score
  created_at timestamptz DEFAULT now()
);

-- Table: purchases (NEW)
CREATE TABLE public.purchases (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.users NOT NULL,
  order_id text UNIQUE NOT NULL, -- Razorpay order ID
  amount int NOT NULL, -- Amount in smallest currency unit (paise)
  sessions_added int NOT NULL, -- Number of sessions purchased
  status text NOT NULL, -- 'pending', 'completed', 'failed'
  created_at timestamptz DEFAULT now()
);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scenarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transcripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;

-- ============================================
-- POLICIES
-- ============================================

-- Users policies
CREATE POLICY "Users can view own profile" 
  ON public.users FOR SELECT 
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" 
  ON public.users FOR UPDATE 
  USING (auth.uid() = id);

-- Scenarios policies
CREATE POLICY "Scenarios are viewable by everyone" 
  ON public.scenarios FOR SELECT 
  USING (true);

-- Sessions policies
CREATE POLICY "Users can view own sessions" 
  ON public.sessions FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sessions" 
  ON public.sessions FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sessions" 
  ON public.sessions FOR UPDATE 
  USING (auth.uid() = user_id);

-- Messages policies
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

-- Transcripts policies
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

-- Purchases policies
CREATE POLICY "Users can view own purchases" 
  ON public.purchases FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own purchases" 
  ON public.purchases FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- ============================================
-- TRIGGERS
-- ============================================

-- Trigger: Create public user on auth signup
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, avatar_url)
  VALUES (
    NEW.id, 
    NEW.email, 
    NEW.raw_user_meta_data->>'full_name', 
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW 
  EXECUTE PROCEDURE public.handle_new_user();

-- Trigger: Increment sessions on purchase completion
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

-- ============================================
-- SEED DATA
-- ============================================

INSERT INTO public.scenarios (role, level, persona, prompt, evaluation_dimensions)
VALUES
  ('SDE', 'L5', 'Skeptical', 'Design a Twitter-scale system that can handle 500M daily active users. Focus on read-heavy workloads, real-time updates, and global distribution.', ARRAY['Architecture','Scale','Leadership']),
  ('PM', 'L5', 'Neutral', 'Launch a new feature to improve user engagement. Define success metrics, prioritization framework, and execution plan.', ARRAY['Metrics','Prioritization','Execution']),
  ('Data Scientist', 'Mid', 'Encouraging', 'Build a fraud detection model for a fintech platform. Handle class imbalance, feature engineering, and model deployment.', ARRAY['ML Pipeline','Metrics','Edge Cases']),
  ('SDE', 'L4', 'Neutral', 'Design a rate limiter for an API gateway. Consider distributed systems, consistency, and performance.', ARRAY['Architecture','Scale','Design Patterns']),
  ('PM', 'Mid', 'Skeptical', 'Prioritize features for Q1 roadmap with limited engineering resources. Balance technical debt, user needs, and business goals.', ARRAY['Prioritization','Stakeholder Management','Trade-offs'])
ON CONFLICT DO NOTHING;
