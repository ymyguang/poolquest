# API Routes

## Public Agent Routes

### `GET /api/agents`

Returns Agent lobby cards.

Must not include private rules.

### `GET /api/agents/:agentId`

Returns Agent detail:
- public profile (opening prophecy, visible stages, persona)
- entry fee
- prize pool
- difficulty
- deployment metadata
- leaderboard summary
- rule hash, solution hash

Must not include hidden path.

## Creator Routes

### `POST /api/agents/generate`

Generates an Agent from creator prompt. Calls LLM Adapter to produce publicProfile + privateRule. Validates generated path can be completed.

### `POST /api/agents/:agentId/regenerate`

Regenerates draft Agent before publish.

### `POST /api/agents/:agentId/publish`

Deploys/registers contracts, publishes Agent. MVP: no creation fee charged.

### `GET /api/creator/agents/:agentId/private-rule`

Returns the full hidden path and generated private rule only to the owning creator. Must not be callable by players or public clients.

## Run Routes

### `POST /api/agents/:agentId/runs`

Starts a Run after entry fee payment (5 QUSD). Creates run record, deducts entry fee, splits to prize pool / platform / creator / protection fund.

### `GET /api/runs/:runId`

Returns visible Run state (progress, time remaining, action count, hint count, current net worth).

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
  "run": {
    "id": "uuid",
    "status": "active",
    "progress": 2,
    "totalSteps": 5,
    "stageStatuses": ["done", "done", "current", "locked", "locked"],
    "timeRemaining": 420,
    "actionCount": 3,
    "hintCount": 0,
    "currentNetWorth": 97.5
  },
  "feedback": {
    "message": "金光闪过，你不确定是龙醒了还是风吹的。",
    "tone": "neutral"
  }
}
```

Backend flow:
1. Validate run is active
2. Record action
3. Call Rule Engine to evaluate
4. Call LLM Adapter to generate riddle feedback (or use fallback)
5. Update run state
6. Return visible state + feedback

### `POST /api/runs/:runId/hints`

Purchases and returns a paid hint. Deducts QUSD, records score penalty.

Request:
```json
{
  "level": 1
}
```

Response:
```json
{
  "feeQusd": "0.4",
  "scorePenalty": 100,
  "message": "火焰需要时间，金币需要耐心。",
  "run": {
    "id": "uuid",
    "hintCount": 1,
    "hintFeeTotalQusd": "0.4"
  }
}
```

## Score Routes

### `GET /api/runs/:runId/score`

Returns score breakdown (only for completed runs).

Response:
```json
{
  "completionScore": 1000,
  "netWorthScore": 200,
  "timeScore": 150,
  "efficiencyScore": 300,
  "lpContributionScore": 200,
  "hintPenalty": 0,
  "cursePenalty": 0,
  "totalScore": 1850
}
```

## Deployment Routes

### `GET /api/agents/:agentId/deployment`

Returns:
- chain ID
- QUSD token address
- Agent token address
- PoolManager address
- Hook address
- Registry address
- Pool ID
- initialize tx hash
- explorer links

## Leaderboard Routes

### `GET /api/agents/:agentId/leaderboard`

Returns top players and current user's best run.

Response:
```json
{
  "entries": [
    {
      "rank": 1,
      "wallet": "0x...",
      "score": 1850,
      "completedAt": "2026-05-27T10:00:00Z"
    }
  ],
  "currentUser": {
    "rank": 5,
    "score": 1200,
    "bestRunId": "uuid"
  }
}
```
