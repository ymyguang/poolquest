# Contract Design

Contracts must satisfy the competition requirement:

> Develop around Uniswap V4 Hook mechanism and deploy V4 Pool + Hook contract on X Layer mainnet or testnet with verifiable addresses.

## Chain Target

Default:

- X Layer mainnet
- Chain ID: `196`
- PoolManager: `0x360E68faCcca8cA495c1B759Fd9EEe466db9FB32`

## Core Contracts

### QUSDToken

PoolQuest platform coin for MVP if no existing QUSD contract is available.

MVP choice:

- Deploy a new ERC20 `QuestUSD` with symbol `QUSD`.
- Treat QUSD as the PoolQuest platform token, not an external stablecoin.

### AgentToken

One ERC20 per Agent.

Examples:

- Dragon Agent -> `DRAGON`
- Witch Agent -> `WITCH`
- Monk Agent -> `MONK`

Each Agent pool is `AgentToken / QUSD`.

The Agent token is the main asset of that Agent dungeon. Player swaps, LP actions, and hold conditions are evaluated around this real Uniswap V4 pool.

### AgentTokenFactory

Deploys or clones AgentToken contracts for newly published Agents.

### PoolQuestRegistry

Source of truth for published Agents.

Stores:

- Agent ID
- Creator
- Agent token
- QUSD token
- Hook address
- PoolManager address
- Pool ID
- Rule hash
- Solution hash
- Prize vault
- Status

Events:

```solidity
event AgentRegistered(
    bytes32 indexed agentId,
    address indexed creator,
    address agentToken,
    address hook,
    bytes32 poolId,
    bytes32 ruleHash,
    bytes32 solutionHash
);
```

### PoolQuestHook

Uniswap V4 Hook for quest action capture and state progression.

Required permissions:

- `afterSwap`
- `afterAddLiquidity`
- `afterRemoveLiquidity`
- `afterDonate`

Responsibilities:

- Bind a player run to a pool
- Record AMM actions
- Update progress according to encoded/verifiable rule checkpoints
- Apply curse/penalty flags
- Record hint purchase effects
- Emit indexable events

Events:

```solidity
event RunStarted(bytes32 indexed agentId, address indexed player, bytes32 indexed runId);
event ActionRecorded(bytes32 indexed runId, address indexed player, uint8 actionType, bytes32 actionHash);
event ProgressUpdated(bytes32 indexed runId, address indexed player, uint8 progress, int256 scoreDelta);
event HintPurchased(bytes32 indexed runId, address indexed player, uint8 level, uint256 feeQusd, int256 scorePenalty);
event CurseApplied(bytes32 indexed runId, address indexed player, bytes32 curseId, int256 scorePenalty);
event QuestCompleted(bytes32 indexed runId, address indexed player, int256 finalScore);
```

### PrizeVault

Holds QUSD prize pools and handles distribution.

### FeeVault

Receives and splits:

- Agent creation fee
- Entry fee
- Hint fee
- Hook fee allocation

## Hidden Rule Representation

MVP approach:

- Backend stores full hidden rule.
- Chain stores `ruleHash` and `solutionHash`.
- Hook records action/progress/hint/completion events and may store compact checkpoints, but it does not need to independently reveal or execute the full hidden path.
- Backend/indexer verifies event consistency.

Future approach:

- Commit-reveal for disputes.
- More rule execution on-chain.
- ZK proof for hidden solution validity.

## Deployment Flow

1. Creator confirms publish.
2. Charge `100 QUSD`, covering `20 QUSD` platform creation fee + `80 QUSD` minimum initial prize pool.
3. Deploy AgentToken.
4. Mine Hook address with required permission bits.
5. Deploy Hook.
6. Initialize Uniswap V4 `AgentToken / QUSD` pool.
7. Register Agent in `PoolQuestRegistry`.
8. Store deployment record in database.
9. Display explorer links and pool ID.

## MVP Contract Acceptance

- Published Agent has a real X Layer Hook address.
- Published Agent has a real V4 Pool ID.
- Hook emits action/progress events.
- Registry stores rule and solution hashes.
- Frontend shows verifiable addresses.
