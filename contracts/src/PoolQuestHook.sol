// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

error OnlyRouter();
error RunNotActive();
error RunAlreadyActive();
error InvalidHintLevel();
error HoldNotReady(uint256 unlockAt);

contract PoolQuestHook {
    uint16 public constant AFTER_ADD_LIQUIDITY_FLAG = 1 << 10;
    uint16 public constant AFTER_SWAP_FLAG = 1 << 6;
    uint16 public constant AFTER_DONATE_FLAG = 1 << 4;
    uint16 public constant REQUIRED_HOOK_FLAGS =
        AFTER_ADD_LIQUIDITY_FLAG | AFTER_SWAP_FLAG | AFTER_DONATE_FLAG;

    uint256 public constant ENTRY_BUDGET_QUSD = 100 ether;
    uint256 public constant HOLD_SECONDS = 180;
    uint256 public constant QUICK_SELL_SECONDS = 60;
    uint256 public constant TIME_LIMIT_SECONDS = 15 minutes;

    address public router;
    address public creator;
    address public platform;

    struct Run {
        bool active;
        bool completed;
        uint8 progress;
        uint40 startedAt;
        uint40 lastActionAt;
        uint40 dragonBoughtAt;
        uint40 lpAddedAt;
        uint8 hintCount;
        uint8 actionCount;
        int256 hintPenalty;
        int256 cursePenalty;
        int256 lpContributionScore;
        int256 finalScore;
    }

    struct RunView {
        bool active;
        bool completed;
        uint8 progress;
        uint40 startedAt;
        uint40 lastActionAt;
        uint40 dragonBoughtAt;
        uint40 holdUnlockAt;
        uint8 hintCount;
        uint8 actionCount;
        int256 hintPenalty;
        int256 cursePenalty;
        int256 lpContributionScore;
        int256 finalScore;
    }

    mapping(address => Run) private runs;
    mapping(address => bytes32[]) private feedbackLog;

    event RouterUpdated(address indexed router);
    event RunEntered(address indexed player, uint40 startedAt);
    event ProgressUpdated(address indexed player, uint8 progress, bytes32 feedbackKey);
    event HintAsked(address indexed player, uint8 level, uint256 feeQusd, int256 penalty);
    event CurseApplied(address indexed player, bytes32 curseKey, int256 penalty);
    event QuestCompleted(address indexed player, int256 finalScore);

    constructor(address initialRouter, address initialCreator, address initialPlatform) {
        router = initialRouter;
        creator = initialCreator;
        platform = initialPlatform;
    }

    modifier onlyRouter() {
        if (msg.sender != router) revert OnlyRouter();
        _;
    }

    function setRouter(address nextRouter) external {
        if (msg.sender != router && msg.sender != creator) revert OnlyRouter();
        router = nextRouter;
        emit RouterUpdated(nextRouter);
    }

    function getHookPermissions()
        external
        pure
        returns (bool canAfterAddLiquidity, bool canAfterSwap, bool canAfterDonate)
    {
        return (true, true, true);
    }

    function enterRun(address player) external onlyRouter {
        Run storage run = runs[player];
        if (run.active && !run.completed) revert RunAlreadyActive();
        runs[player] = Run({
            active: true,
            completed: false,
            progress: 0,
            startedAt: uint40(block.timestamp),
            lastActionAt: uint40(block.timestamp),
            dragonBoughtAt: 0,
            lpAddedAt: 0,
            hintCount: 0,
            actionCount: 0,
            hintPenalty: 0,
            cursePenalty: 0,
            lpContributionScore: 0,
            finalScore: 0
        });
        delete feedbackLog[player];
        feedbackLog[player].push("opening_prophecy");
        emit RunEntered(player, uint40(block.timestamp));
    }

    function afterDonate(address player, uint256 amountQusd) external onlyRouter {
        Run storage run = _activeRun(player);
        _tick(run);
        if (run.progress == 0 && amountQusd > 0) {
            _advance(player, run, 1, "smoke_rises");
        } else {
            _softFeedback(player, run, "dragon_smells_repeat_smoke");
        }
    }

    function afterAddLiquidity(address player, uint256 qusdAmount, uint256 dragonAmount)
        external
        onlyRouter
    {
        Run storage run = _activeRun(player);
        _tick(run);
        if (run.progress == 1 && qusdAmount > 0 && dragonAmount > 0) {
            run.lpAddedAt = uint40(block.timestamp);
            _advance(player, run, 2, "scales_cover_hand");
        } else {
            _softFeedback(player, run, "scales_do_not_fit_yet");
        }
    }

    function afterSwap(address player, bool buyDragon, uint256 amountIn, uint256 amountOut)
        external
        onlyRouter
    {
        Run storage run = _activeRun(player);
        _tick(run);
        if (buyDragon && run.progress == 2 && amountIn > 0 && amountOut > 0) {
            run.dragonBoughtAt = uint40(block.timestamp);
            _advance(player, run, 3, "gold_in_claw");
            return;
        }

        if (!buyDragon && run.progress == 3 && block.timestamp < run.dragonBoughtAt + QUICK_SELL_SECONDS) {
            _applyCurse(player, run, "quick_sell_curse", -300);
            return;
        }

        if (!buyDragon && run.progress >= 4 && amountIn > 0) {
            _complete(player, run);
            return;
        }

        _softFeedback(player, run, buyDragon ? bytes32("gold_echoes_again") : bytes32("door_stays_closed"));
    }

    function claimHold(address player) external onlyRouter {
        Run storage run = _activeRun(player);
        _tick(run);
        if (run.progress != 3 || block.timestamp < run.dragonBoughtAt + HOLD_SECONDS) {
            revert HoldNotReady(run.dragonBoughtAt + HOLD_SECONDS);
        }
        _advance(player, run, 4, "flame_bows");
    }

    function askHint(uint8 level) external returns (uint256 feeQusd, int256 penalty) {
        return _askHint(msg.sender, level);
    }

    function askHintFor(address player, uint8 level)
        external
        onlyRouter
        returns (uint256 feeQusd, int256 penalty)
    {
        return _askHint(player, level);
    }

    function getRun(address player) external view returns (RunView memory viewRun) {
        Run storage run = runs[player];
        viewRun = RunView({
            active: run.active,
            completed: run.completed,
            progress: run.progress,
            startedAt: run.startedAt,
            lastActionAt: run.lastActionAt,
            dragonBoughtAt: run.dragonBoughtAt,
            holdUnlockAt: run.dragonBoughtAt == 0 ? 0 : uint40(run.dragonBoughtAt + HOLD_SECONDS),
            hintCount: run.hintCount,
            actionCount: run.actionCount,
            hintPenalty: run.hintPenalty,
            cursePenalty: run.cursePenalty,
            lpContributionScore: run.lpContributionScore,
            finalScore: run.finalScore
        });
    }

    function getProgress(address player) external view returns (uint8) {
        return runs[player].progress;
    }

    function hintFeeQusd(address player, uint8 level) public view returns (uint256) {
        if (level < 1 || level > 3) revert InvalidHintLevel();
        uint256 base = level == 1 ? 0.2 ether : level == 2 ? 0.6 ether : 1.5 ether;
        uint256 repeat = _repeatMultiplierBps(runs[player].hintCount + 1);
        uint256 progress = _progressMultiplierBps(runs[player].progress);
        return (base * repeat * progress) / 100_000_000;
    }

    function hintPenalty(address player, uint8 level) public view returns (int256) {
        if (level < 1 || level > 3) revert InvalidHintLevel();
        int256 base = level == 1 ? int256(50) : level == 2 ? int256(150) : int256(400);
        int256 repeat = int256(_repeatMultiplierBps(runs[player].hintCount + 1));
        int256 progress = int256(_progressMultiplierBps(runs[player].progress));
        return (base * repeat * progress) / 100_000_000;
    }

    function latestFeedback(address player) external view returns (bytes32) {
        bytes32[] storage log = feedbackLog[player];
        if (log.length == 0) return bytes32(0);
        return log[log.length - 1];
    }

    function feedbackCount(address player) external view returns (uint256) {
        return feedbackLog[player].length;
    }

    function feedbackAt(address player, uint256 index) external view returns (bytes32) {
        return feedbackLog[player][index];
    }

    function _activeRun(address player) internal view returns (Run storage run) {
        run = runs[player];
        if (!run.active || run.completed) revert RunNotActive();
    }

    function _tick(Run storage run) internal {
        run.actionCount += 1;
        run.lastActionAt = uint40(block.timestamp);
    }

    function _advance(address player, Run storage run, uint8 progress, bytes32 feedbackKey) internal {
        run.progress = progress;
        feedbackLog[player].push(feedbackKey);
        emit ProgressUpdated(player, progress, feedbackKey);
    }

    function _softFeedback(address player, Run storage run, bytes32 feedbackKey) internal {
        feedbackLog[player].push(feedbackKey);
        emit ProgressUpdated(player, run.progress, feedbackKey);
    }

    function _applyCurse(address player, Run storage run, bytes32 curseKey, int256 penalty) internal {
        run.cursePenalty += penalty;
        feedbackLog[player].push(curseKey);
        emit CurseApplied(player, curseKey, penalty);
    }

    function _askHint(address player, uint8 level)
        internal
        returns (uint256 feeQusd, int256 penalty)
    {
        Run storage run = _activeRun(player);
        feeQusd = hintFeeQusd(player, level);
        penalty = hintPenalty(player, level);
        run.hintCount += 1;
        run.hintPenalty -= penalty;
        bytes32 key = level == 1 ? bytes32("hint_level_1") : level == 2 ? bytes32("hint_level_2") : bytes32("hint_level_3");
        feedbackLog[player].push(key);
        emit HintAsked(player, level, feeQusd, penalty);
    }

    function _complete(address player, Run storage run) internal {
        run.progress = 5;
        run.completed = true;
        run.active = false;
        run.lpContributionScore = _lpScore(run);
        int256 completionScore = 1000;
        int256 timeScore = _timeScore(run.startedAt);
        int256 efficiencyScore = _efficiencyScore(run.actionCount);
        run.finalScore = completionScore
            + timeScore
            + efficiencyScore
            + run.lpContributionScore
            + run.hintPenalty
            + run.cursePenalty;
        feedbackLog[player].push("treasure_opened");
        emit QuestCompleted(player, run.finalScore);
    }

    function _lpScore(Run storage run) internal view returns (int256) {
        if (run.lpAddedAt == 0) return 0;
        uint256 held = block.timestamp - run.lpAddedAt;
        if (held >= 10 minutes) return 350;
        if (held >= 5 minutes) return 250;
        if (held >= 3 minutes) return 150;
        if (held < 60) return -200;
        return 0;
    }

    function _timeScore(uint40 startedAt) internal view returns (int256) {
        uint256 elapsed = block.timestamp - startedAt;
        if (elapsed >= TIME_LIMIT_SECONDS) return 0;
        return int256((300 * (TIME_LIMIT_SECONDS - elapsed)) / TIME_LIMIT_SECONDS);
    }

    function _efficiencyScore(uint8 actionCount) internal pure returns (int256) {
        if (actionCount <= 5) return 300;
        if (actionCount == 6) return 250;
        if (actionCount == 7) return 200;
        if (actionCount == 8) return 150;
        if (actionCount == 9) return 100;
        if (actionCount == 10) return 50;
        return 0;
    }

    function _repeatMultiplierBps(uint256 askNumber) internal pure returns (uint256) {
        if (askNumber == 1) return 10_000;
        if (askNumber == 2) return 15_000;
        if (askNumber == 3) return 25_000;
        if (askNumber == 4) return 40_000;
        return 60_000;
    }

    function _progressMultiplierBps(uint8 progress) internal pure returns (uint256) {
        if (progress <= 1) return 10_000;
        if (progress == 2) return 15_000;
        if (progress == 3) return 20_000;
        if (progress == 4) return 30_000;
        return 50_000;
    }
}
