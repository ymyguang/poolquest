# Database Schema

The database stores public Agent metadata, private hidden rules, run history, AI messages, and indexed chain state.

Suggested MVP database: PostgreSQL.

## users

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY,
  wallet_address TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

## agents

```sql
CREATE TABLE agents (
  id UUID PRIMARY KEY,
  creator_user_id UUID NOT NULL REFERENCES users(id),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  theme TEXT NOT NULL,
  persona TEXT NOT NULL,
  token_name TEXT NOT NULL,
  token_symbol TEXT NOT NULL,
  status TEXT NOT NULL,
  difficulty TEXT NOT NULL,
  create_cost_qusd NUMERIC NOT NULL DEFAULT 100,
  platform_creation_fee_qusd NUMERIC NOT NULL DEFAULT 20,
  minimum_prize_seed_qusd NUMERIC NOT NULL DEFAULT 80,
  entry_fee_qusd NUMERIC NOT NULL DEFAULT 1,
  initial_prize_pool_qusd NUMERIC NOT NULL DEFAULT 80,
  current_prize_pool_qusd NUMERIC NOT NULL DEFAULT 80,
  rule_hash TEXT NOT NULL,
  solution_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  published_at TIMESTAMPTZ
);
```

`status` values:

- `draft`
- `generated`
- `deploying`
- `published`
- `paused`
- `review`
- `archived`

For MVP, `create_cost_qusd = 100` is split into `platform_creation_fee_qusd = 20` and `minimum_prize_seed_qusd = 80`. Additional creator-funded prize pool can be added on top of the minimum seed.

`token_name` and `token_symbol` represent the Agent role token. By default they are derived from the Agent identity, such as `Dragon` and `DRAGON`.

## agent_public_profiles

```sql
CREATE TABLE agent_public_profiles (
  agent_id UUID PRIMARY KEY REFERENCES agents(id),
  opening_prophecy TEXT NOT NULL,
  visible_stages JSONB NOT NULL,
  public_actions JSONB NOT NULL,
  agent_style JSONB NOT NULL,
  preview_image_url TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

## agent_private_rules

Private table. Never served to player frontend. Creators may read their own Agent's private rule through creator-only authenticated management APIs.

```sql
CREATE TABLE agent_private_rules (
  agent_id UUID PRIMARY KEY REFERENCES agents(id),
  hidden_path JSONB NOT NULL,
  state_transitions JSONB NOT NULL,
  punishments JSONB NOT NULL,
  blessings JSONB NOT NULL,
  hint_ladder JSONB NOT NULL,
  validation_cases JSONB NOT NULL,
  generator_model TEXT NOT NULL,
  generator_prompt TEXT NOT NULL,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

## agent_deployments

```sql
CREATE TABLE agent_deployments (
  agent_id UUID PRIMARY KEY REFERENCES agents(id),
  chain_id INTEGER NOT NULL,
  qusd_token_address TEXT NOT NULL,
  agent_token_address TEXT NOT NULL,
  pool_manager_address TEXT NOT NULL,
  hook_address TEXT NOT NULL,
  registry_address TEXT NOT NULL,
  prize_vault_address TEXT,
  pool_id TEXT NOT NULL,
  initialize_tx_hash TEXT NOT NULL,
  publish_tx_hash TEXT NOT NULL,
  deployed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

## runs

```sql
CREATE TABLE runs (
  id UUID PRIMARY KEY,
  agent_id UUID NOT NULL REFERENCES agents(id),
  player_user_id UUID NOT NULL REFERENCES users(id),
  chain_run_id TEXT,
  status TEXT NOT NULL,
  progress INTEGER NOT NULL DEFAULT 0,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ,
  action_count INTEGER NOT NULL DEFAULT 0,
  hint_count INTEGER NOT NULL DEFAULT 0,
  entry_fee_qusd NUMERIC NOT NULL,
  hint_fee_total_qusd NUMERIC NOT NULL DEFAULT 0,
  curse_penalty INTEGER NOT NULL DEFAULT 0,
  hint_penalty INTEGER NOT NULL DEFAULT 0,
  final_score INTEGER,
  final_net_worth_qusd NUMERIC
);
```

`status` values:

- `active`
- `completed`
- `failed`
- `expired`
- `abandoned`

## run_actions

```sql
CREATE TABLE run_actions (
  id UUID PRIMARY KEY,
  run_id UUID NOT NULL REFERENCES runs(id),
  action_index INTEGER NOT NULL,
  action_type TEXT NOT NULL,
  action_payload JSONB NOT NULL,
  tx_hash TEXT,
  block_number BIGINT,
  rule_result JSONB NOT NULL,
  visible_feedback TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

Action types:

- `swap_buy`
- `swap_sell`
- `add_liquidity`
- `remove_liquidity`
- `donate`
- `hold`
- `ask_hint`

## agent_messages

```sql
CREATE TABLE agent_messages (
  id UUID PRIMARY KEY,
  run_id UUID NOT NULL REFERENCES runs(id),
  action_id UUID REFERENCES run_actions(id),
  message_type TEXT NOT NULL,
  reveal_level INTEGER NOT NULL,
  content TEXT NOT NULL,
  model TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

Message types:

- `opening_prophecy`
- `free_feedback`
- `paid_hint`
- `system_result`

## leaderboard_entries

```sql
CREATE TABLE leaderboard_entries (
  id UUID PRIMARY KEY,
  agent_id UUID NOT NULL REFERENCES agents(id),
  player_user_id UUID NOT NULL REFERENCES users(id),
  best_run_id UUID NOT NULL REFERENCES runs(id),
  best_score INTEGER NOT NULL,
  completed_at TIMESTAMPTZ NOT NULL,
  UNIQUE(agent_id, player_user_id)
);
```

## contract_events

```sql
CREATE TABLE contract_events (
  id UUID PRIMARY KEY,
  chain_id INTEGER NOT NULL,
  contract_address TEXT NOT NULL,
  event_name TEXT NOT NULL,
  tx_hash TEXT NOT NULL,
  log_index INTEGER NOT NULL,
  block_number BIGINT NOT NULL,
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(chain_id, tx_hash, log_index)
);
```
