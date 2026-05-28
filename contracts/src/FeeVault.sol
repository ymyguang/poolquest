// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {QuestToken} from "./QuestToken.sol";
import {PrizeVault} from "./PrizeVault.sol";

/// @title FeeVault
/// @notice Receives and splits PoolQuest fees:
///         - Entry Fee: 60% prize, 20% platform, 10% creator, 10% protection
///         - Hint Fee: 100% prize
///         - Hook Fee: 100% platform (MVP)
contract FeeVault {
    // ─── State ─────────────────────────
    address public owner;
    address public platform;
    QuestToken public qusd;
    PrizeVault public prizeVault;

    // ─── Events ─────────────────────────
    event EntryFeeSplit(
        bytes32 indexed agentId,
        address indexed player,
        uint256 total,
        uint256 toPrize,
        uint256 toPlatform,
        uint256 toCreator,
        uint256 toProtection
    );
    event HintFeeSent(bytes32 indexed agentId, uint256 amount);
    event HookFeeSent(uint256 amount);

    // ─── Errors ─────────────────────────
    error OnlyOwner();
    error TransferFailed();

    // ─── Constructor ─────────────────────────────
    constructor(address _qusd, address _prizeVault, address _platform) {
        owner = msg.sender;
        qusd = QuestToken(_qusd);
        prizeVault = PrizeVault(_prizeVault);
        platform = _platform;
    }

    // ─── Entry Fee Split ─────────────────────────

    /// @notice Split a 5 QUSD entry fee into 4 destinations
    function payEntryFee(
        bytes32 agentId,
        address player,
        address creator,
        uint256 totalFee
    ) external {
        // Pull QUSD from player
        _pull(player, totalFee);

        uint256 toPrize = (totalFee * 60) / 100;      // 60%
        uint256 toPlatform = (totalFee * 20) / 100;    // 20%
        uint256 toCreator = (totalFee * 10) / 100;     // 10%
        uint256 toProtection = totalFee - toPrize - toPlatform - toCreator; // 10%

        // Let PrizeVault pull from this contract so its accounting and token
        // transfer stay in a single call.
        qusd.approve(address(prizeVault), toPrize);
        prizeVault.depositPrize(agentId, toPrize);

        // Send to platform
        _transfer(platform, toPlatform);

        // Send to creator
        _transfer(creator, toCreator);

        // Protection fund stays in this contract for MVP
        // (can be distributed later)

        emit EntryFeeSplit(agentId, player, totalFee, toPrize, toPlatform, toCreator, toProtection);
    }

    // ─── Hint Fee (100% to prize) ─────────────────

    function payHintFee(
        bytes32 agentId,
        address player,
        uint256 fee
    ) external {
        _pull(player, fee);
        qusd.approve(address(prizeVault), fee);
        prizeVault.depositPrize(agentId, fee);
        emit HintFeeSent(agentId, fee);
    }

    // ─── Hook Fee (100% to platform for MVP) ─────────────────

    function payHookFee(uint256 fee) external {
        // Called by router after swap
        _transfer(platform, fee);
        emit HookFeeSent(fee);
    }

    // ─── Internal ─────────────────

    function _pull(address from, uint256 amount) internal {
        if (!qusd.transferFrom(from, address(this), amount)) {
            revert TransferFailed();
        }
    }

    function _transfer(address to, uint256 amount) internal {
        if (!qusd.transfer(to, amount)) {
            revert TransferFailed();
        }
    }
}
