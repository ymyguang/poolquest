// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IHooks} from "@uniswap/v4-core/src/interfaces/IHooks.sol";
import {IPoolManager} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import {PoolKey} from "@uniswap/v4-core/src/types/PoolKey.sol";
import {BalanceDelta} from "@uniswap/v4-core/src/types/BalanceDelta.sol";
import {BeforeSwapDelta} from "@uniswap/v4-core/src/types/BeforeSwapDelta.sol";
import {ModifyLiquidityParams, SwapParams} from "@uniswap/v4-core/src/types/PoolOperation.sol";
import {Hooks} from "@uniswap/v4-core/src/libraries/Hooks.sol";

/// @title PoolQuestHook
/// @notice Uniswap V4 Hook that records game state for PoolQuest dungeon runs.
///         This hook intercepts afterSwap, afterAddLiquidity, afterRemoveLiquidity,
///         and afterDonate to record player actions as game progress events.
///         The full hidden rule evaluation lives in the backend; the hook provides
///         on-chain verifiable proof of player actions and progress.
contract PoolQuestHook is IHooks {
    // ─── Permission Flags ─────────────────────────────────────────
    uint160 public constant AFTER_SWAP_FLAG = 1 << 6;
    uint160 public constant AFTER_ADD_LIQUIDITY_FLAG = 1 << 10;
    uint160 public constant AFTER_REMOVE_LIQUIDITY_FLAG = 1 << 8;
    uint160 public constant AFTER_DONATE_FLAG = 1 << 4;
    uint160 public constant REQUIRED_FLAGS = AFTER_SWAP_FLAG
        | AFTER_ADD_LIQUIDITY_FLAG
        | AFTER_REMOVE_LIQUIDITY_FLAG
        | AFTER_DONATE_FLAG;

    // ─── Constants ────────────────────────────────────────────────────
    uint256 public constant TIME_LIMIT_SECONDS = 10 minutes;
    uint256 public constant QUICK_SELL_SECONDS = 60;
    uint256 public constant QUICK_LP_EXIT_SECONDS = 60;

    // ─── State ────────────────────────────────────────────────────────
    IPoolManager public immutable poolManager;
    address public owner;

    struct Run {
        bool active;
        bool completed;
        uint8 progress;
        uint8 totalSteps;
        uint40 startedAt;
        uint40 lastActionAt;
        uint40 lastBuyAt;
        uint40 lastLpAddAt;
        uint8 hintCount;
        uint8 actionCount;
        int256 hintPenalty;
        int256 cursePenalty;
        int256 finalScore;
        bytes32 ruleHash;
    }

    mapping(address => Run) public runs;
    mapping(address => bytes32[]) public actionLog;

    // ─── Events ─────────────────────────────────
    event RunStarted(
        address indexed player,
        uint40 startedAt,
        uint8 totalSteps,
        bytes32 ruleHash
    );
    event ActionRecorded(
        address indexed player,
        uint8 actionType,
        uint8 progress,
        bytes32 feedbackKey
    );
    event ProgressUpdated(
        address indexed player,
        uint8 oldProgress,
        uint8 newProgress,
        bytes32 feedbackKey
    );
    event HintPurchased(
        address indexed player,
        uint8 level,
        uint256 feeQusd,
        int256 penalty,
        uint8 hintCount
    );
    event CurseApplied(
        address indexed player,
        bytes32 curseId,
        int256 penalty
    );
    event QuestCompleted(
        address indexed player,
        int256 finalScore,
        uint256 durationSeconds
    );
    event RunExpired(address indexed player);

    // ─── Errors ─────────────────────────────────
    error OnlyOwner();
    error RunAlreadyActive();
    error RunNotActive();
    error RunAlreadyCompleted();
    error InvalidHookAddress();
    error InvalidTotalSteps();

    // ─── Modifiers ────────────────────────────────────────────────────
    modifier onlyOwner() {
        if (msg.sender != owner) revert OnlyOwner();
        _;
    }

    modifier onlyPoolManager() {
        require(msg.sender == address(poolManager));
        _;
    }

    // ─── Constructor ─────────────────────────────────────────
    constructor(IPoolManager _poolManager, address initialOwner) {
        poolManager = _poolManager;
        owner = initialOwner;
    }

    function transferOwnership(address nextOwner) external onlyOwner {
        require(nextOwner != address(0));
        owner = nextOwner;
    }

    // ─── IHooks: getHookPermissions ─────────────────────────
    function getHookPermissions() public pure returns (Hooks.Permissions memory) {
        return Hooks.Permissions({
            beforeInitialize: false,
            afterInitialize: false,
            beforeAddLiquidity: false,
            afterAddLiquidity: true,
            beforeRemoveLiquidity: false,
            afterRemoveLiquidity: true,
            beforeSwap: false,
            afterSwap: true,
            beforeDonate: false,
            afterDonate: true,
            beforeSwapReturnDelta: false,
            afterSwapReturnDelta: false,
            afterAddLiquidityReturnDelta: false,
            afterRemoveLiquidityReturnDelta: false
        });
    }

    // ─── IHooks: Unused Before Hooks (return selector only) ────

    function beforeInitialize(
        address,
        PoolKey calldata,
        uint160
    ) external pure override returns (bytes4) {
        return IHooks.beforeInitialize.selector;
    }

    function afterInitialize(
        address,
        PoolKey calldata,
        uint160,
        int24
    ) external pure override returns (bytes4) {
        return IHooks.afterInitialize.selector;
    }

    function beforeAddLiquidity(
        address,
        PoolKey calldata,
        ModifyLiquidityParams calldata,
        bytes calldata
    ) external pure override returns (bytes4) {
        return IHooks.beforeAddLiquidity.selector;
    }

    function beforeRemoveLiquidity(
        address,
        PoolKey calldata,
        ModifyLiquidityParams calldata,
        bytes calldata
    ) external pure override returns (bytes4) {
        return IHooks.beforeRemoveLiquidity.selector;
    }

    function beforeSwap(
        address,
        PoolKey calldata,
        SwapParams calldata,
        bytes calldata
    ) external pure override returns (bytes4, BeforeSwapDelta, uint24) {
        return (IHooks.beforeSwap.selector, BeforeSwapDelta.wrap(0), 0);
    }

    function beforeDonate(
        address,
        PoolKey calldata,
        uint256,
        uint256,
        bytes calldata
    ) external pure override returns (bytes4) {
        return IHooks.beforeDonate.selector;
    }

    // ─── Run Management (called by owner/backend) ─────────────────────

    /// @notice Start a new run for a player
    function startRun(
        address player,
        uint8 totalSteps,
        bytes32 ruleHash
    ) external onlyOwner returns (bool) {
        Run storage run = runs[player];
        if (run.active && !run.completed) revert RunAlreadyActive();
        if (totalSteps == 0 || totalSteps > 10) revert InvalidTotalSteps();

        runs[player] = Run({
            active: true,
            completed: false,
            progress: 0,
            totalSteps: totalSteps,
            startedAt: uint40(block.timestamp),
            lastActionAt: uint40(block.timestamp),
            lastBuyAt: 0,
            lastLpAddAt: 0,
            hintCount: 0,
            actionCount: 0,
            hintPenalty: 0,
            cursePenalty: 0,
            finalScore: 0,
            ruleHash: ruleHash
        });

        // Clear previous action log
        delete actionLog[player];

        emit RunStarted(player, uint40(block.timestamp), totalSteps, ruleHash);
        return true;
    }

    /// @notice Record a hint purchase
    function recordHint(
        address player,
        uint8 level,
        uint256 feeQusd,
        int256 penalty
    ) external onlyOwner {
        Run storage run = runs[player];
        if (!run.active || run.completed) revert RunNotActive();

        run.hintCount += 1;
        run.hintPenalty += penalty;
        run.lastActionAt = uint40(block.timestamp);

        actionLog[player].push(
            keccak256(abi.encodePacked("hint_", level, "_", run.hintCount))
        );

        emit HintPurchased(player, level, feeQusd, penalty, run.hintCount);
    }

    /// @notice Mark a run as failed (time expired or abandoned)
    function expireRun(address player) external onlyOwner {
        Run storage run = runs[player];
        if (!run.active || run.completed) revert RunNotActive();

        run.active = false;
        emit RunExpired(player);
    }

    /// @notice Record backend-confirmed progress (after Rule Engine evaluation)
    function confirmProgress(
        address player,
        uint8 newProgress,
        bytes32 feedbackKey
    ) external onlyOwner {
        Run storage run = runs[player];
        if (!run.active || run.completed) revert RunNotActive();

        uint8 oldProgress = run.progress;
        run.progress = newProgress;
        run.lastActionAt = uint40(block.timestamp);

        // Check completion
        if (newProgress >= run.totalSteps) {
            _completeRun(player, run);
        }

        emit ProgressUpdated(player, oldProgress, newProgress, feedbackKey);
    }

    // ─── Hook Callbacks (called by PoolManager) ─────────────────

    /// @notice Called after a swap. Records the action on-chain.
    function afterSwap(
        address sender,
        PoolKey calldata key,
        SwapParams calldata params,
        BalanceDelta delta,
        bytes calldata hookData
    ) external override onlyPoolManager returns (bytes4, int128) {
        (address player, uint8 actionHint) = _decodeHookData(sender, hookData);
        Run storage run = runs[player];
        if (!run.active || run.completed) {
            return (IHooks.afterSwap.selector, 0);
        }

        run.actionCount += 1;
        run.lastActionAt = uint40(block.timestamp);

        bool isBuy = actionHint == 1 || (actionHint == 0 && !params.zeroForOne);

        if (isBuy) {
            run.lastBuyAt = uint40(block.timestamp);
            actionLog[player].push(keccak256(abi.encodePacked("swap_buy_", run.actionCount)));
            emit ActionRecorded(player, 1, run.progress, keccak256("swap_buy"));
        } else {
            // Check quick sell curse
            if (run.lastBuyAt > 0
                && block.timestamp < run.lastBuyAt + QUICK_SELL_SECONDS) {
                run.cursePenalty += 300;
                emit CurseApplied(player, keccak256("quick_sell_curse"), 300);
            }
            actionLog[player].push(keccak256(abi.encodePacked("swap_sell_", run.actionCount)));
            emit ActionRecorded(player, 2, run.progress, keccak256("swap_sell"));
        }

        return (IHooks.afterSwap.selector, 0);
    }

    /// @notice Called after liquidity is added.
    function afterAddLiquidity(
        address sender,
        PoolKey calldata key,
        ModifyLiquidityParams calldata params,
        BalanceDelta delta,
        BalanceDelta feesAccrued,
        bytes calldata hookData
    ) external override onlyPoolManager returns (bytes4, BalanceDelta) {
        (address player,) = _decodeHookData(sender, hookData);
        Run storage run = runs[player];
        if (!run.active || run.completed) {
            return (IHooks.afterAddLiquidity.selector, BalanceDelta.wrap(0));
        }

        run.actionCount += 1;
        run.lastActionAt = uint40(block.timestamp);
        run.lastLpAddAt = uint40(block.timestamp);

        actionLog[player].push(keccak256(abi.encodePacked("add_lp_", run.actionCount)));
        emit ActionRecorded(player, 3, run.progress, keccak256("add_liquidity"));

        return (IHooks.afterAddLiquidity.selector, BalanceDelta.wrap(0));
    }

    /// @notice Called after liquidity is removed. Checks quick LP exit curse.
    function afterRemoveLiquidity(
        address sender,
        PoolKey calldata key,
        ModifyLiquidityParams calldata params,
        BalanceDelta delta,
        BalanceDelta feesAccrued,
        bytes calldata hookData
    ) external override onlyPoolManager returns (bytes4, BalanceDelta) {
        (address player,) = _decodeHookData(sender, hookData);
        Run storage run = runs[player];
        if (!run.active || run.completed) {
            return (IHooks.afterRemoveLiquidity.selector, BalanceDelta.wrap(0));
        }

        run.actionCount += 1;
        run.lastActionAt = uint40(block.timestamp);

        // Check quick LP exit curse
        if (run.lastLpAddAt > 0
            && block.timestamp < run.lastLpAddAt + QUICK_LP_EXIT_SECONDS) {
            run.cursePenalty += 200;
            emit CurseApplied(player, keccak256("quick_lp_exit"), 200);
        }

        actionLog[player].push(keccak256(abi.encodePacked("remove_lp_", run.actionCount)));
        emit ActionRecorded(player, 4, run.progress, keccak256("remove_liquidity"));

        return (IHooks.afterRemoveLiquidity.selector, BalanceDelta.wrap(0));
    }

    /// @notice Called after a donation.
    function afterDonate(
        address sender,
        PoolKey calldata key,
        uint256 amount0,
        uint256 amount1,
        bytes calldata hookData
    ) external override onlyPoolManager returns (bytes4) {
        (address player,) = _decodeHookData(sender, hookData);
        Run storage run = runs[player];
        if (!run.active || run.completed) {
            return IHooks.afterDonate.selector;
        }

        run.actionCount += 1;
        run.lastActionAt = uint40(block.timestamp);

        actionLog[player].push(keccak256(abi.encodePacked("donate_", run.actionCount)));
        emit ActionRecorded(player, 5, run.progress, keccak256("donate"));

        return IHooks.afterDonate.selector;
    }

    // ─── View Functions ───────────────────────────────────────────────

    function getRun(address player) external view returns (Run memory) {
        return runs[player];
    }

    function getProgress(address player) external view returns (uint8) {
        return runs[player].progress;
    }

    function getActionLog(address player) external view returns (bytes32[] memory) {
        return actionLog[player];
    }

    function getActionCount(address player) external view returns (uint256) {
        return actionLog[player].length;
    }

    function isActive(address player) external view returns (bool) {
        Run storage run = runs[player];
        return run.active && !run.completed;
    }

    // ─── Internal ─────────────────────────────────────────────────────

    function _completeRun(address player, Run storage run) internal {
        run.completed = true;
        run.active = false;

        int256 completionScore = 1000;
        int256 timeScore = _timeScore(run.startedAt);
        int256 efficiencyScore = _efficiencyScore(run.actionCount);

        run.finalScore = completionScore
            + timeScore
            + efficiencyScore
            - run.hintPenalty
            - run.cursePenalty;

        uint256 duration = block.timestamp - run.startedAt;
        emit QuestCompleted(player, run.finalScore, duration);
    }

    function _decodeHookData(
        address fallbackPlayer,
        bytes calldata hookData
    ) internal pure returns (address player, uint8 actionHint) {
        if (hookData.length == 64) {
            (player, actionHint) = abi.decode(hookData, (address, uint8));
        } else if (hookData.length == 32) {
            player = abi.decode(hookData, (address));
            actionHint = 0;
        } else {
            player = fallbackPlayer;
            actionHint = 0;
        }
    }

    function _timeScore(uint40 startedAt) internal view returns (int256) {
        uint256 elapsed = block.timestamp - startedAt;
        if (elapsed >= TIME_LIMIT_SECONDS) return 0;
        return int256((300 * (TIME_LIMIT_SECONDS - elapsed)) / TIME_LIMIT_SECONDS);
    }

    function _efficiencyScore(uint8 actionCount) internal pure returns (int256) {
        if (actionCount <= 5) return 300;
        if (actionCount <= 6) return 250;
        if (actionCount <= 7) return 200;
        if (actionCount <= 8) return 150;
        if (actionCount <= 9) return 100;
        if (actionCount <= 10) return 50;
        return 0;
    }
}
