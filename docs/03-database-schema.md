# Database Schema

The database stores public Agent metadata, private hidden rules, run history, AI messages, and indexed chain state.

MVP database: PostgreSQL.

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
  hint_style TEXT NOT NULL DEFAULT 'riddle',
  entry_fee_qusd NUMERIC NOT NULL DEFAULT 5,
  platform_share_qusd NUMERIC NOT NULL DEFAULT 1,
  creator_share_qusd NUMERIC NOT NULL DEFAULT 0.5,
  protection_fund_share_qusd NUMERIC NOT NULL DEFAULT 0.5,
  prize_pool_seed_qusd NUMERIC NOT NULL DEFAULT 0,
  current_prize_pool_qusd NUMERIC NOT NULL DEFAULT 0,
  rule_hash TEXT NOT NULL,
  solution_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  published_at TIMESTAMPTZ
);
```

`status` values:
- `draft` — creator started but not generated
- `generated` — LLM generated, pending creator review
- `publishing` — deploying contracts
- `published` — live, accepting players
- `paused` — temporarily disabled
- `review` — under platform review (no completions after 24h)
- `archived` — no longer active

## agent_public_profiles

```sql
CREATE TABLE agent_public_profiles (
  agent_id UUID PRIMARY KEY REFERENCES agents(id),
  opening_prophecy TEXT NOT NULL,
  visible_stages JSONB NOT NULL,
  public_actions JSONB NOT NULL,
  agent_persona JSONB NOT NULL,
  preview_image_url TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

`visible_stages` example:
```json
["拜访", "钥匙", "锁链", "沉默", "突破"]
```

`public_actions` example:
```json
[
  {"id": "swap_buy", "label": "Buy Token", "lore": "Exchange QUSD for AgentToken"},
  {"id": "swap_sell", "label": "Sell Token", "lore": "Exchange AgentToken for QUSD"},
  {"id": "add_liquidity", "label": "Add LP", "lore": "Provide liquidity to the pool"},
  {"id": "remove_liquidity", "label": "Remove LP", "lore": "Withdraw your liquidity"},
  {"id": "donate", "label": "Donate", "lore": "Offer QUSD to the pool"},
  {"id": "hold", "label": "Hold", "lore": "Wait for the right moment"}
]
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
  feedback_templates JSONB NOT NULL,
  validation_cases JSONB NOT NULL,
  generator_model TEXT NOT NULL,
  generator_prompt TEXT NOT NULL,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

`hidden_path` example:
```json
[
  {"step": 0, "action": "donate", "params": {"minAmountQusd": 1}},
  {"step": 1, "action": "swap_buy", "params": {"tokenOut": "DRAGON"}},
  {"step": 2, "action": "add_liquidity", "params": {"minDurationSeconds": 120}},
  {"step": 3, "action": "hold_duration", "params": {"seconds": 120}},
  {"step": 4, "action": "swap_sell", "params": {"tokenIn": "DRAGON"}}
]
```

`hint_ladder` example:
```json
{
  "level1": [
    "方向性谜语：暗示玩家应该关注什么",
    "不提及具体操作名"
  ],
  "level2": [
    "范围提示：暗示下一步操作的类型",
    "仍用世界观语言"
  ],
  "level3": [
    "接近答案：几乎直接说操作",
    "仍是谜语风格但足够明确"
  ]
}
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
  total_steps INTEGER NOT NULL DEFAULT 5,
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
- `active` — in progress
- `completed` — all steps done + net worth ≥ 85
- `failed` — time expired or net worth < 85
- `abandoned` — player gave up

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

`rule_result` example:
```json
{
  "progressDelta": 1,
  "feedbackIntent": "player_took_gold_but_must_wait",
  "danger": true,
  "curse": null,
  "completed": false,
  "scoreDelta": 0,
  "mustNotReveal": ["hold", "wait 120 seconds"]
}
```

## agent_messages

```sql
CREATE TABLE agent_messages (
  id UUID PRIMARY KEY,
  run_id UUID NOT NULL REFERENCES runs(id),
  action_id UUID REFERENCES run_actions(id),
  message_type TEXT NOT NULL,
  hint_level INTEGER,
  content TEXT NOT NULL,
  model TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

Message types:
- `opening_prophecy` — shown when run starts
- `free_feedback` — after each player action
- `paid_hint` — when player asks for hint
- `system_result` — completion/failure message

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

Only completed runs qualify. One entry per wallet per Agent (best score).

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
