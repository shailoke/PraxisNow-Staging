-- Create ENUMs for type safety
create type notification_channel as enum ('email', 'in_app');
create type notification_status as enum ('pending', 'sent', 'failed');

-- Create the notifications table
create table if not exists public.notifications (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.users(id) not null,
  type text not null, -- 'signup', 'purchase', 'payment_failed', 'session_used', 'pdf_ready'
  channel notification_channel not null,
  status notification_status default 'pending'::notification_status not null,
  metadata jsonb default '{}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Indexes for performance and idempotency checks
create index if not exists notifications_user_id_idx on public.notifications(user_id);
-- Index for checking duplicate purchase confirmations (idempotency)
create index if not exists notifications_order_id_idx on public.notifications((metadata->>'order_id')); 

-- Enable Row Level Security
alter table public.notifications enable row level security;

-- Policies
-- Users can only see their own notifications
create policy "Users can view their own notifications"
  on public.notifications for select
  using (auth.uid() = user_id);

-- System (Service Role) has full access, but we don't need explicit policies for Service Role as it bypasses RLS.
-- If we want to allow client-side creation (unlikely for transactional emails), we would add insert policy.
-- For now, keep it restricted.
