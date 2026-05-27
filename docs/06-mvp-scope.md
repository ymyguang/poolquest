# MVP Scope

## Goal

Build a competition-ready PoolQuest demo that proves the full system loop:

```text
Create Agent -> LLM generates hidden quest + riddle feedback -> publish AgentToken/QUSD V4 pool + Hook -> player solves through AMM actions -> Agent gives riddle feedback -> score calculated -> leaderboard updates
```

## Must Have

### Product
- Agent lobby
- Create Agent flow
- AI generation / design review (creator can see full path)
- Publish confirmation
- Agent detail
- Run interaction page
- Leaderboard section

### Backend
- API server (Node/TypeScript)
- PostgreSQL schema + migrations
- Agent creation endpoints
- LLM adapter (with deterministic fallback)
- Hidden rule storage
- Rule Engine (deterministic action evaluation)
- Run action evaluation
- Agent feedback/hint endpoints (riddle-style)
- Quest Score calculation
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
- Agent card list (lobby)
- Create Agent form
- Agent role token display (e.g. Dragon -> DRAGON / QUSD)
- Public preview (riddle-style, never reveals path)
- Agent detail (opening prophecy, stages, entry fee, prize pool)
- Run action console (Swap/Buy/Sell/AddLP/RemoveLP/Donate/Hold)
- Agent chat/feedback (riddle feedback + paid hints)
- Score breakdown on completion
- Leaderboard
- Contract address panel (verifiable addresses)

### AI
- LLM adapter interface
- OpenAI/Claude adapter implementation
- Deterministic fallback generator for demo reliability
- Quest generation with riddle constraints
- Free feedback generation (riddle-style, never confirms correct/incorrect)
- Paid hint generation (3 levels, vague to near-answer)
- Schema validation
- Guardrails against solution leakage
- Fallback templates for AI failure

## Nice to Have
- Agent image generation
- Multi-Agent themes beyond first demo
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
- Creator creation fee (free in MVP)
- Escrow release logic (simplified for MVP)
- Anti-wash penalty (single Run context doesn't need it)
- LP Guardian rewards

## Demo Script

1. Open Agent lobby, show existing Dragon Agent and QUSD balance.
2. Create a new Agent with prompt.
3. Show LLM-generated public preview (riddle prophecy, visible stages).
4. Show creator-only view with full hidden path.
5. Publish Agent, show contract addresses and explorer links.
6. Enter Agent detail as player.
7. Start Run (5 QUSD entry fee).
8. Try a wrong action, receive riddle-style free feedback (not a direct confirmation).
9. Ask paid hint, show QUSD cost + score penalty.
10. Complete the hidden path through exploration.
11. Show score breakdown, leaderboard update, and verifiable contract addresses.

## Delivery Milestones

### Milestone 1: System Skeleton
- Monorepo structure
- API server
- Database migrations
- Frontend routing
- Contract package

### Milestone 2: Agent Creation
- Create Agent pages
- LLM adapter (with fallback)
- Private rule storage
- Public preview
- Creator-only full path view

### Milestone 3: Chain Integration
- QUSD + AgentToken
- Registry + Hook
- V4 pool initialization
- X Layer deployment metadata

### Milestone 4: Run Gameplay
- Run API
- Rule Engine (deterministic evaluation)
- Riddle feedback generation
- Hint payment logic
- Frontend interaction page

### Milestone 5: Competition Polish
- Score calculation
- Leaderboard
- Address verification panel
- Demo seed data
- README
- Deployment guide
- Browser QA
