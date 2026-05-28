// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title PoolQuestRegistry
/// @notice On-chain registry of published PoolQuest Agents.
///         Stores Agent metadata, deployment info, and rule hashes.
contract PoolQuestRegistry {
    // ─── State ─────────────────────────────────────────
    address public owner;

    struct AgentRecord {
        address creator;
        address agentToken;
        address qusdToken;
        address hook;
        bytes32 poolId;
        bytes32 ruleHash;
        bytes32 solutionHash;
        uint256 entryFeeQusd;
        uint256 prizePoolSeedQusd;
        uint40 publishedAt;
        bool exists;
    }

    mapping(bytes32 => AgentRecord) public agents;
    bytes32[] public agentIds;
    mapping(address => bytes32[]) public creatorAgents;

    // ─── Events ─────────────────────────────────
    event AgentRegistered(
        bytes32 indexed agentId,
        address indexed creator,
        address agentToken,
        address hook,
        bytes32 poolId,
        bytes32 ruleHash,
        bytes32 solutionHash
    );
    event AgentStatusChanged(bytes32 indexed agentId, bool active);

    // ─── Errors ─────────────────────────────────────────
    error OnlyOwner();
    error AgentAlreadyRegistered();
    error AgentNotFound();

    // ─── Modifiers ─────────────────────────────────────────────────
    modifier onlyOwner() {
        if (msg.sender != owner) revert OnlyOwner();
        _;
    }

    // ─── Constructor ──────────────────────────────────────────────────
    constructor() {
        owner = msg.sender;
    }

    // ─── Registration ─────────────────────────────────────────────────

    function registerAgent(
        bytes32 agentId,
        address creator,
        address agentToken,
        address qusdToken,
        address hook,
        bytes32 poolId,
        bytes32 ruleHash,
        bytes32 solutionHash,
        uint256 entryFeeQusd,
        uint256 prizePoolSeedQusd
    ) external onlyOwner {
        if (agents[agentId].exists) revert AgentAlreadyRegistered();

        agents[agentId] = AgentRecord({
            creator: creator,
            agentToken: agentToken,
            qusdToken: qusdToken,
            hook: hook,
            poolId: poolId,
            ruleHash: ruleHash,
            solutionHash: solutionHash,
            entryFeeQusd: entryFeeQusd,
            prizePoolSeedQusd: prizePoolSeedQusd,
            publishedAt: uint40(block.timestamp),
            exists: true
        });

        agentIds.push(agentId);
        creatorAgents[creator].push(agentId);

        emit AgentRegistered(
            agentId, creator, agentToken, hook, poolId, ruleHash, solutionHash
        );
    }

    // ─── View Functions ─────────────────────────

    function getAgent(bytes32 agentId) external view returns (AgentRecord memory) {
        if (!agents[agentId].exists) revert AgentNotFound();
        return agents[agentId];
    }

    function getAgentCount() external view returns (uint256) {
        return agentIds.length;
    }

    function getAgentIdByIndex(uint256 index) external view returns (bytes32) {
        return agentIds[index];
    }

    function getCreatorAgents(address creator) external view returns (bytes32[] memory) {
        return creatorAgents[creator];
    }

    function isRegistered(bytes32 agentId) external view returns (bool) {
        return agents[agentId].exists;
    }
}
