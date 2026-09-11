create table if not exists logistics_player_state (
  username text primary key,
  balance numeric not null default 12480000,
  lanes jsonb not null default '[]'::jsonb,
  facilities jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default current_timestamp
);

create index if not exists logistics_player_state_updated_idx on logistics_player_state (updated_at);
