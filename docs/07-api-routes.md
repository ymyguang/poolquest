# API Routes

## Public Agent Routes

### `GET /api/agents`

Returns Agent lobby cards.

Must not include private rules.

### `GET /api/agents/:agentId`

Returns Agent detail:

- public profile
- visible stages
- entry fee
- prize pool
- deployment metadata
- leaderboard summary

Must not include hidden path.

## Creator Routes

### `POST /api/agents/generate`

Generates an Agent from creator prompt.

### `POST /api/agents/:agentId/regenerate`

Regenerates draft Agent before publish.

### `POST /api/agents/:agentId/publish`

Charges `100 QUSD` (`20 QUSD` platform creation fee + `80 QUSD` minimum initial prize pool), deploys/registers contracts, publishes Agent.

### `GET /api/creator/agents/:agentId/private-rule`

Returns the full hidden path and generated private rule only to the owning creator.

Must not be callable by players or public clients.

## Run Routes

### `POST /api/agents/:agentId/runs`

Starts a Run after entry fee payment.

### `GET /api/runs/:runId`

Returns visible Run state.

### `POST /api/runs/:runId/actions`

Records a player action and returns visible evaluation.

Request:

```json
{
  "actionType": "swap_buy",
  "txHash": "0x...",
  "payload": {}
}
```

Response:

```json
{
  "run": {},
  "feedback": {
    "message": "金币已经入爪，但火焰还没有低头。",
    "tone": "danger"
  }
}
```

### `POST /api/runs/:runId/hints`

Purchases and returns a paid hint.

## Deployment Routes

### `GET /api/agents/:agentId/deployment`

Returns:

- chain ID
- QUSD token
- Agent token
- PoolManager
- Hook
- Registry
- Pool ID
- initialize tx
- explorer links

## Leaderboard Routes

### `GET /api/agents/:agentId/leaderboard`

Returns top players and current user's best run.
