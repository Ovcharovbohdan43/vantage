create table if not exists email_messages (
  id uuid primary key default gen_random_uuid(),
  direction text not null check (direction in ('inbound', 'outbound')),
  resend_id text unique,
  from_address text not null,
  to_addresses jsonb not null default '[]'::jsonb,
  subject text,
  text_body text,
  html_body text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists email_messages_direction_created_idx
  on email_messages (direction, created_at desc);
