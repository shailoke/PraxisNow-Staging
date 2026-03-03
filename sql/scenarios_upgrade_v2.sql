-- 1. Create Custom Scenarios Table
-- "User Scenarios (CUSTOM BUILDER) ... Stored only overrides"
create table if not exists public.custom_scenarios (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) not null,
  base_scenario_id int references public.scenarios(id) not null,
  
  -- Overrides
  title text not null, -- User provided name (or auto-generated)
  company_context text,
  focus_dimensions text[], -- "Focus dimensions (MAX 3)"
  
  created_at timestamptz default now()
);

-- 2. Update Sessions Table to link to Custom Scenarios
alter table public.sessions
add column if not exists custom_scenario_id uuid references public.custom_scenarios(id);

-- 3. Add Evaluation Columns (Required by Dashboard & Eval System)
-- The schema image shows these are missing.
alter table public.sessions
add column if not exists clarity int check (clarity between 0 and 100),
add column if not exists structure int check (structure between 0 and 100),
add column if not exists recovery int check (recovery between 0 and 100),
add column if not exists signal_noise int check (signal_noise between 0 and 100),

-- Text Insights
add column if not exists key_insight text,
add column if not exists improvement_priorities text[], -- Array of strings

-- Pro+ Columns
add column if not exists alternative_approaches text[],
add column if not exists pattern_analysis text,
add column if not exists risk_projection text,
add column if not exists readiness_assessment text,
add column if not exists framework_contrast text;

-- 4. RLS Policies
alter table public.custom_scenarios enable row level security;

create policy "Users can read own custom scenarios"
  on public.custom_scenarios for select
  using (auth.uid() = user_id);

create policy "Users can create own custom scenarios"
  on public.custom_scenarios for insert
  with check (auth.uid() = user_id);

create policy "Users can delete own custom scenarios"
  on public.custom_scenarios for delete
  using (auth.uid() = user_id);
