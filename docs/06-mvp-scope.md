# MVP Scope

## Goal

Build a competition-ready PoolQuest demo that proves the full system loop:

```text
Create Agent -> AI generates hidden quest -> publish AgentToken/QUSD V4 pool + Hook -> player solves through AMM actions -> Agent gives feedback -> leaderboard updates
```

## Must Have

### Product

- Agent lobby
- Create Agent flow
- AI generation/design review
- Publish confirmation
- Agent detail
- Run interaction page
- Leaderboard section

### Backend

- API server
- PostgreSQL schema
- Agent creation endpoints
- AI generation adapter
- Hidden rule storage
- Run action evaluation
- Agent feedback/hint endpoints
- X Layer event indexer
- Deployment metadata endpoint

### Contracts

- Self-deployed QUSD platform token
- Agent token factory
- PoolQuest registry
- PoolQuest Hook
- Prize/Fee vault minimal version
- X Layer deployment scripts

### Frontend

- Wallet connect
- X Layer network detection
- QUSD balance display
- Agent card list
- Create Agent form
- Agent role token display, e.g. `Dragon -> DRAGON / QUSD`
- Public preview
- Agent detail
- Run action console
- Agent chat/feedback
- Contract address panel

### AI

- Deterministic fallback generator for demo reliability
- LLM adapter behind env config
- Schema validation
- Guardrails against solution leakage

## Nice to Have

- Agent image generation
- Multi-Agent themes beyond Dragon
- Claim rewards flow
- Dispute/review flow
- Creator revenue unlock UI
- Full season settlement

## Explicit Non-goals for MVP

- ZK hidden solution proof
- Fully decentralized AI generation
- Cross-chain deployment
- Complex multi-pool routing
- Permissionless unbounded rule language

## Demo Script

1. Open Agent lobby.
2. Show existing Dragon Agent and QUSD balance.
3. Create a new Agent with prompt.
4. Show AI-generated public preview and hidden-rule hash.
5. Publish Agent and show deployment metadata.
6. Enter Agent detail.
7. Start Run.
8. Try a wrong action and receive fuzzy Agent feedback.
9. Ask paid hint and show QUSD cost + score penalty.
10. Complete the hidden path.
11. Show Hook/registry/pool addresses and leaderboard update.

## Delivery Milestones

### Milestone 1: System Skeleton

- Monorepo structure
- API server
- Database migrations
- Frontend routing
- Contract package

### Milestone 2: Agent Creation

- Create Agent pages
- AI generator adapter
- Private rule storage
- Public preview

### Milestone 3: Chain Integration

- QUSD + AgentToken
- Registry + Hook
- V4 pool initialization
- X Layer deployment metadata

### Milestone 4: Run Gameplay

- Run API
- action evaluation
- AI feedback
- hint payment logic
- frontend interaction page

### Milestone 5: Competition Polish

- Address verification panel
- Demo seed data
- README
- deployment guide
- browser QA
