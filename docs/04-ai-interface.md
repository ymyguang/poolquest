# AI / LLM Interface

AI is used for content generation and narrative response. AI does not decide game truth.

## Design Principle

Rule Engine and Hook decide game state. AI turns that state into riddle-style in-world language. AI never confirms correct/incorrect actions directly.

## LLM Adapter Interface

```typescript
interface LLMAdapter {
  generateQuest(prompt: CreatorPrompt): Promise<GeneratedQuest>
  generateFeedback(ctx: FeedbackContext): Promise<string>
  generateHint(ctx: HintContext): Promise<string>
}
```

## Quest Generation API

```http
POST /api/agents/generate
```

Request:
```json
{
  "creator": "0x...",
  "agentName": "Dragon",
  "theme": "A dragon guarding a treasure pool",
  "persona": "Ancient, proud, speaks in riddles",
  "difficulty": "medium",
  "hintStyle": "riddle",
  "initialPrizePoolQusd": "0",
  "prompt": "Create a dragon dungeon where players must infer the correct AMM action path through riddle clues."
}
```

Private AI output:
```json
{
  "publicProfile": {
    "name": "Dragon Pool",
    "theme": "Dragon treasure dungeon",
    "tokenSymbol": "DRAGON",
    "openingProphecy": "古老的巨龙只接受诚心的拜访者。先证明你的诚意，再谈金币的事。",
    "visibleStages": ["拜访", "钥匙", "锁链", "沉默", "突破"],
    "agentPersona": {
      "tone": "ancient, proud, indirect",
      "forbiddenStyle": "never mention raw action names as the next answer"
    }
  },
  "privateRule": {
    "hiddenPath": [
      { "step": 0, "action": "donate", "params": { "minAmountQusd": 1 } },
      { "step": 1, "action": "swap_buy", "params": { "tokenOut": "DRAGON" } },
      { "step": 2, "action": "add_liquidity", "params": { "minDurationSeconds": 120 } },
      { "step": 3, "action": "hold_duration", "params": { "seconds": 120 } },
      { "step": 4, "action": "swap_sell", "params": { "tokenIn": "DRAGON" } }
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
      "level1": ["火焰需要时间，金币需要耐心"],
      "level2": ["让时间站在你这边"],
      "level3": ["安静地坐在龙穴里，等火焰低头"]
    },
    "feedbackTemplates": {
      "correct_donate": "有什么东西在暗处动了一下。也许它注意到了你。",
      "correct_buy": "金光闪过，你不确定是龙醒了还是风吹的。",
      "wrong_sell": "你转身的时候，身后有什么东西安静下来了。那不是好的安静。",
      "correct_lp": "鳞片慢慢覆盖了你的手。你不确定这是保护还是束缚。",
      "danger_quick_sell": "金币还烫着。有些转身来得太早。"
    },
    "validationCases": []
  }
}
```

Backend responsibilities:
- Validate JSON schema
- Simulate generated hidden path (can complete within 10 min, with 100 QUSD, final net worth ≥ 85)
- Reject invalid or impossible quests
- Compute ruleHash and solutionHash
- Store privateRule in agent_private_rules
- Serve publicProfile to public/player frontend
- Serve privateRule only to the owning creator through creator-only authenticated management APIs

## Hidden Path Constraints

LLM must select from the operation library:

```
donate, add_liquidity, remove_liquidity, swap_buy, swap_sell,
hold_duration, hold_price, combo
```

Path constraints:
```
1. Length: 5 steps (4-6 allowed by difficulty)
2. Each step must be verifiable (chain event or timestamp)
3. Must complete within 10 minutes
4. Must complete with ≤ 100 QUSD initial funds
5. Final net worth must be ≥ 85 QUSD (simulated)
6. No unavoidable punishments
7. First and last step must differ
8. Adjacent steps cannot be mutually exclusive (e.g. Buy → immediate Sell)
```

## Opening Prophecy Constraints

```
1. Must be riddle-style, cannot name operations directly
2. Only hints at first 1-2 steps, not all 5
3. Must match the world/agent persona
4. Player should know "what type of thing to do" but not "what exactly"
5. Must be consistent with the real Hook rules
```

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
    "mustNotReveal": ["hold", "wait 120 seconds"]
  },
  "revealPolicy": "free_feedback"
}
```

Response:
```json
{
  "message": "金光闪过，你不确定是龙醒了还是风吹的。",
  "revealLevel": 0,
  "uiTone": "danger"
}
```

### Free Feedback Constraints

```
1. Must be riddle-style, cannot directly confirm correct/incorrect
2. Use world/agent language, never use operation names
3. Correct action: hint that direction is right, but don't confirm
4. Wrong action: hint that direction is wrong, but don't point to correct direction
5. Dangerous action: warn but don't say why
6. Player must NOT be able to determine correctness from a single feedback
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
  "message": "让时间站在你这边。"
}
```

### Hint Content Constraints

```
Level 1 (direction): "what you should pay attention to"
  → "火焰需要时间，金币需要耐心" — hints Hold, but doesn't say how long

Level 2 (range): "what type of operation"
  → "让时间站在你这边" — more clearly hints Hold/wait

Level 3 (close): "what to do specifically"
  → "安静地坐在龙穴里，等火焰低头" — almost says Hold, but still world-language
```

## Guardrails

System prompt for feedback/hints must include:

```
You are the Agent narrator, not the judge.
The Rule Engine result is final.
Never reveal the full hidden path.
Never list the next raw AMM action unless revealPolicy explicitly allows it.
Free feedback must be riddle-style and in-world.
Never directly confirm whether a player's action was correct or incorrect.
Paid hints may become more specific by level, but must preserve the Agent persona.
The message must be consistent with ruleEvaluation.
Never use operation names (swap, buy, sell, LP, donate, hold) directly in player-facing text.
```

Creator-only generation review can reveal the complete hidden path. Player-facing feedback and hints cannot.

## AI Failure Handling

If AI response fails, backend returns deterministic fallback text from:
1. `privateRule.feedbackTemplates` (matched by feedbackIntent)
2. `privateRule.hintLadder` (matched by level)
3. Generic world-language fallback

Player progress must not block on AI availability.
