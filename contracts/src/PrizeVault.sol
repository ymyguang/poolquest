// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {QuestToken} from "./QuestToken.sol";

/// @title PrizeVault
/// @notice Holds QUSD prize pools for PoolQuest Agents.
///         Each Agent has its own prize pool that accumulates from
///         Entry Fees and Hint Fees. Top players can claim rewards.
contract PrizeVault {
    // ─── State ─────────────────────────────────
    address public owner;
    QuestToken public qusd;

    struct PrizePool {
        uint256 totalDeposited;
        uint256 totalClaimed;
        bool finalized;
    }

    mapping(bytes32 => PrizePool) public pools; // agentId => pool
    mapping(bytes32 => mapping(address => uint256)) public claims; // agentId => player => amount

    // ─── Events ─────────────────
    event PrizeDeposited(bytes32 indexed agentId, uint256 amount);
    event PrizeClaimed(bytes32 indexed agentId, address indexed player, uint256 amount);
    event PoolFinalized(bytes32 indexed agentId, uint256 totalPrize);

    // ─── Errors ─────────────────────────────────
    error OnlyOwner();
    error InsufficientBalance();
    error AlreadyClaimed();
    error PoolNotFinalized();

    // ─── Modifiers ──────────────────────────────
    modifier onlyOwner() {
        if (msg.sender != owner) revert OnlyOwner();
        _;
    }

    // ─── Constructor ─────────────────────────────────
    constructor(address _qusd) {
        owner = msg.sender;
        qusd = QuestToken(_qusd);
    }

    // ─── Deposit ─────────────────────────────────────────────────

    function depositPrize(bytes32 agentId, uint256 amount) external {
        // Anyone can deposit (Entry Fee / Hint Fee routing)
        require(qusd.transferFrom(msg.sender, address(this), amount));
        pools[agentId].totalDeposited += amount;
        emit PrizeDeposited(agentId, amount);
    }

    // ─── Finalize & Claim ──────────────────────────────────────────

    function setClaim(
        bytes32 agentId,
        address player,
        uint256 amount
    ) external onlyOwner {
        if (!pools[agentId].finalized) revert PoolNotFinalized();
        claims[agentId][player] = amount;
    }

    function finalizePool(bytes32 agentId) external onlyOwner {
        pools[agentId].finalized = true;
        emit PoolFinalized(
            agentId,
            pools[agentId].totalDeposited - pools[agentId].totalClaimed
        );
    }

    function claimPrize(bytes32 agentId) external {
        uint256 amount = claims[agentId][msg.sender];
        if (amount == 0) revert AlreadyClaimed();

        claims[agentId][msg.sender] = 0;
        pools[agentId].totalClaimed += amount;

        require(qusd.transfer(msg.sender, amount));
        emit PrizeClaimed(agentId, msg.sender, amount);
    }

    // ─── View ─────────────────────────

    function getPoolInfo(bytes32 agentId) external view returns (
        uint256 totalDeposited,
        uint256 totalClaimed,
        uint256 available,
        bool finalized
    ) {
        PrizePool storage pool = pools[agentId];
        return (
            pool.totalDeposited,
            pool.totalClaimed,
            pool.totalDeposited - pool.totalClaimed,
            pool.finalized
        );
    }

    function getClaimAmount(bytes32 agentId, address player) external view returns (uint256) {
        return claims[agentId][player];
    }
}
