# AI Interface

AI is used for content generation and narrative response. AI does not decide truth.

## Design Principle

Rule Engine and Hook decide game state. AI turns that state into in-world language.

## Agent Generation API

```http
POST /api/agents/generate
```

Request:

```json
{
  "creator": "0x...",
  "agentName": "Dragon",
  "theme": "A dragon guarding a treasure pool",
  "tokenSymbol": "DRAGON",
  "difficulty": "medium",
  "initialPrizePoolQusd": "100",
  "hintStyle": "riddle",
  "prompt": "Create a dragon dungeon where players must infer the correct AMM action path."
}
```

Private AI output:

```json
{
  "publicProfile": {
    "name": "Dragon Pool",
    "theme": "Dragon treasure dungeon",
    "tokenSymbol": "DRAGON",
    "openingProphecy": "献上第一缕烟...",
    "visibleStages": ["烟雾", "龙鳞", "金币", "火焰", "宝藏"],
    "agentPersona": {
      "tone": "ancient, proud, indirect",
      "forbiddenStyle": "never mention raw action names as the next answer"
    }
  },
  "privateRule": {
    "hiddenPath": [
      { "action": "donate", "asset": "QUSD", "minAmount": "1" },
      { "action": "add_liquidity", "pair": "DRAGON/QUSD", "minDurationSeconds": 180 },
      { "action": "swap_buy", "tokenOut": "DRAGON" },
      { "action": "hold", "durationSeconds": 180 },
      { "action": "swap_sell", "tokenIn": "DRAGON" }
    ],
    "punishments": [
      {
        "id": "quick_sell_curse",
        "condition": "swap_sell within 60 seconds after swap_buy",
        "scorePenalty": 300
      }
    ],
    "blessings": [],
    "hintLadder": {
      "level1": ["方向性谜语"],
      "level2": ["更接近但不直说"],
      "level3": ["接近答案但仍然世界观表达"]
    },
    "validationCases": []
  }
}
```

Backend responsibilities:

- Validate JSON schema.
- Simulate generated hidden path.
- Reject invalid or impossible quests.
- Compute `ruleHash`.
- Compute `solutionHash`.
- Store `privateRule` in `agent_private_rules`.
- Serve `publicProfile` to public/player frontend.
- Serve `privateRule` only to the owning creator through creator-only authenticated management APIs.

## Free Feedback API

```http
POST /api/agent/respond
```

Request:

```json
{
  "agentId": "uuid",
  "runId": "uuid",
  "playerVisibleState": {
    "visibleStages": ["done", "done", "danger", "locked", "locked"],
    "publicInventory": {
      "qusd": "82",
      "agentToken": "18"
    }
  },
  "lastAction": {
    "type": "swap_buy",
    "txHash": "0x..."
  },
  "ruleEvaluation": {
    "result": "progress",
    "progressDelta": 1,
    "feedbackIntent": "player_took_gold_but_must_wait",
    "danger": true,
    "mustNotReveal": ["hold", "wait 180 seconds"]
  },
  "revealPolicy": "free_feedback"
}
```

Response:

```json
{
  "message": "你拿起了金币。现在，别让金币的声音太急。",
  "revealLevel": 0,
  "uiTone": "danger"
}
```

## Paid Hint API

```http
POST /api/agent/hint
```

Request:

```json
{
  "agentId": "uuid",
  "runId": "uuid",
  "level": 2,
  "paidFeeQusd": "1.8",
  "paymentTxHash": "0x..."
}
```

Response:

```json
{
  "feeQusd": "1.8",
  "scorePenalty": 450,
  "message": "让火焰安静下来需要时间。等一会儿，比多拿一枚金币更重要。"
}
```

## Guardrails

System prompt for feedback/hints must include:

```text
You are the Agent narrator, not the judge.
The Rule Engine result is final.
Never reveal the full hidden path.
Never list the next raw AMM action unless revealPolicy explicitly allows it.
Free feedback must be fuzzy and in-world.
Paid hints may become more specific by level, but must preserve the Agent persona.
The message must be consistent with ruleEvaluation.
```

Creator-only generation review can reveal the complete hidden path. Player-facing feedback and hints cannot.

## AI Failure Handling

If AI response fails, backend should return deterministic fallback text from `privateRule.hintLadder` or `feedbackTemplates`.

Player progress must not block on AI availability.
