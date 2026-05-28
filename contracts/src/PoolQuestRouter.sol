// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {QuestToken} from "./QuestToken.sol";
import {PoolQuestHook} from "./PoolQuestHook.sol";
import {FeeVault} from "./FeeVault.sol";
import {IUnlockCallback} from "@uniswap/v4-core/src/interfaces/callback/IUnlockCallback.sol";
import {IPoolManager} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import {IERC20Minimal} from "@uniswap/v4-core/src/interfaces/external/IERC20Minimal.sol";
import {IHooks} from "@uniswap/v4-core/src/interfaces/IHooks.sol";
import {PoolKey} from "@uniswap/v4-core/src/types/PoolKey.sol";
import {Currency} from "@uniswap/v4-core/src/types/Currency.sol";
import {BalanceDelta, BalanceDeltaLibrary} from "@uniswap/v4-core/src/types/BalanceDelta.sol";
import {ModifyLiquidityParams, SwapParams} from "@uniswap/v4-core/src/types/PoolOperation.sol";
import {TickMath} from "@uniswap/v4-core/src/libraries/TickMath.sol";

/// @title PoolQuestRouter
/// @notice Entry point for PoolQuest runs and real Uniswap V4 pool actions.
contract PoolQuestRouter is IUnlockCallback {
    using BalanceDeltaLibrary for BalanceDelta;

    enum ActionKind {
        Donate,
        AddLiquidity,
        RemoveLiquidity,
        Swap
    }

    address public owner;
    QuestToken public qusd;
    QuestToken public agentToken;
    PoolQuestHook public hook;
    FeeVault public feeVault;
    IPoolManager public poolManager;
    PoolKey public poolKey;

    struct RunInfo {
        bytes32 agentId;
        address creator;
        uint40 startedAt;
    }

    struct CallbackData {
        ActionKind kind;
        address payer;
        PoolKey key;
        uint256 amount0;
        uint256 amount1;
        ModifyLiquidityParams liquidityParams;
        SwapParams swapParams;
        bytes hookData;
    }

    mapping(address => RunInfo) public playerRuns;
    mapping(address => bool) public demoFundsClaimed;

    event RunEntered(address indexed player, bytes32 indexed agentId, uint40 startedAt);
    event PlayerFunded(address indexed player, uint256 qusdAmount, uint256 agentAmount);
    event DemoFundsClaimed(address indexed player, uint256 qusdAmount, uint256 agentAmount);
    event PoolAction(address indexed player, uint8 actionType, BalanceDelta delta);

    error OnlyOwner();
    error OnlyPoolManager();
    error TransferFailed();
    error DemoFundsAlreadyClaimed();

    modifier onlyOwner() {
        if (msg.sender != owner) revert OnlyOwner();
        _;
    }

    constructor(
        address _qusd,
        address _agentToken,
        address _hook,
        address _feeVault,
        address _poolManager
    ) {
        owner = msg.sender;
        qusd = QuestToken(_qusd);
        agentToken = QuestToken(_agentToken);
        hook = PoolQuestHook(_hook);
        feeVault = FeeVault(_feeVault);
        poolManager = IPoolManager(_poolManager);

        (Currency currency0, Currency currency1) = _sortCurrencies(_qusd, _agentToken);
        poolKey = PoolKey({
            currency0: currency0,
            currency1: currency1,
            fee: 3000,
            tickSpacing: 60,
            hooks: IHooks(_hook)
        });
    }

    function enterRun(
        address player,
        bytes32 agentId,
        address creator,
        uint8 totalSteps,
        bytes32 ruleHash
    ) external onlyOwner {
        _enterRun(player, agentId, creator, totalSteps, ruleHash);
    }

    function enterSelf(
        bytes32 agentId,
        address creator,
        uint8 totalSteps,
        bytes32 ruleHash
    ) external {
        if (hook.isActive(msg.sender)) {
            hook.expireRun(msg.sender);
        }
        _enterRun(msg.sender, agentId, creator, totalSteps, ruleHash);
    }

    function claimDemoFunds() external {
        if (demoFundsClaimed[msg.sender]) revert DemoFundsAlreadyClaimed();
        demoFundsClaimed[msg.sender] = true;
        uint256 qusdAmount = 250 ether;
        uint256 agentAmount = 250 ether;
        qusd.mint(msg.sender, qusdAmount);
        agentToken.mint(msg.sender, agentAmount);
        emit DemoFundsClaimed(msg.sender, qusdAmount, agentAmount);
    }

    function _enterRun(
        address player,
        bytes32 agentId,
        address creator,
        uint8 totalSteps,
        bytes32 ruleHash
    ) internal {
        feeVault.payEntryFee(agentId, player, creator, 5 ether);
        hook.startRun(player, totalSteps, ruleHash);
        qusd.mint(player, 100 ether);
        playerRuns[player] = RunInfo({
            agentId: agentId,
            creator: creator,
            startedAt: uint40(block.timestamp)
        });
        emit RunEntered(player, agentId, uint40(block.timestamp));
    }

    function purchaseHint(
        address player,
        uint8 level,
        uint256 feeQusd,
        int256 penalty
    ) external onlyOwner {
        feeVault.payHintFee(playerRuns[player].agentId, player, feeQusd);
        hook.recordHint(player, level, feeQusd, penalty);
    }

    function confirmProgress(
        address player,
        uint8 newProgress,
        bytes32 feedbackKey
    ) external onlyOwner {
        hook.confirmProgress(player, newProgress, feedbackKey);
    }

    function expireRun(address player) external onlyOwner {
        hook.expireRun(player);
    }

    function fundPlayer(
        address player,
        uint256 qusdAmount,
        uint256 agentAmount
    ) external onlyOwner {
        if (qusdAmount > 0) qusd.mint(player, qusdAmount);
        if (agentAmount > 0) agentToken.mint(player, agentAmount);
        emit PlayerFunded(player, qusdAmount, agentAmount);
    }

    function donate(uint256 amountQusd) external returns (BalanceDelta delta) {
        (uint256 amount0, uint256 amount1) = _amountsForQusd(amountQusd);
        delta = _unlock(CallbackData({
            kind: ActionKind.Donate,
            payer: msg.sender,
            key: poolKey,
            amount0: amount0,
            amount1: amount1,
            liquidityParams: ModifyLiquidityParams(0, 0, 0, bytes32(0)),
            swapParams: SwapParams(false, 0, 0),
            hookData: abi.encode(msg.sender, uint8(5))
        }));
        emit PoolAction(msg.sender, 5, delta);
    }

    function addLiquidity(
        uint256 qusdAmount,
        uint256 agentAmount,
        int256 liquidityDelta
    ) external returns (BalanceDelta delta) {
        (uint256 amount0, uint256 amount1) = _amountsForPair(qusdAmount, agentAmount);
        delta = _unlock(CallbackData({
            kind: ActionKind.AddLiquidity,
            payer: msg.sender,
            key: poolKey,
            amount0: amount0,
            amount1: amount1,
            liquidityParams: ModifyLiquidityParams(
                TickMath.minUsableTick(poolKey.tickSpacing),
                TickMath.maxUsableTick(poolKey.tickSpacing),
                liquidityDelta,
                bytes32(0)
            ),
            swapParams: SwapParams(false, 0, 0),
            hookData: abi.encode(msg.sender, uint8(3))
        }));
        emit PoolAction(msg.sender, 3, delta);
    }

    function removeLiquidity(int256 liquidityDelta) external returns (BalanceDelta delta) {
        delta = _unlock(CallbackData({
            kind: ActionKind.RemoveLiquidity,
            payer: msg.sender,
            key: poolKey,
            amount0: 0,
            amount1: 0,
            liquidityParams: ModifyLiquidityParams(
                TickMath.minUsableTick(poolKey.tickSpacing),
                TickMath.maxUsableTick(poolKey.tickSpacing),
                -_abs(liquidityDelta),
                bytes32(0)
            ),
            swapParams: SwapParams(false, 0, 0),
            hookData: abi.encode(msg.sender, uint8(4))
        }));
        emit PoolAction(msg.sender, 4, delta);
    }

    function swapBuy(uint256 amountQusdIn) external returns (BalanceDelta delta) {
        bool zeroForOne = Currency.unwrap(poolKey.currency0) == address(qusd);
        delta = _swapExactIn(msg.sender, zeroForOne, amountQusdIn, 1);
    }

    function swapSell(uint256 amountAgentIn) external returns (BalanceDelta delta) {
        bool zeroForOne = Currency.unwrap(poolKey.currency0) == address(agentToken);
        delta = _swapExactIn(msg.sender, zeroForOne, amountAgentIn, 2);
    }

    function unlockCallback(bytes calldata rawData) external returns (bytes memory) {
        if (msg.sender != address(poolManager)) revert OnlyPoolManager();

        CallbackData memory data = abi.decode(rawData, (CallbackData));
        BalanceDelta delta;

        if (data.kind == ActionKind.Donate) {
            delta = poolManager.donate(data.key, data.amount0, data.amount1, data.hookData);
        } else if (data.kind == ActionKind.AddLiquidity || data.kind == ActionKind.RemoveLiquidity) {
            (delta,) = poolManager.modifyLiquidity(data.key, data.liquidityParams, data.hookData);
        } else {
            delta = poolManager.swap(data.key, data.swapParams, data.hookData);
        }

        _settleDelta(data.key.currency0, data.payer, delta.amount0());
        _settleDelta(data.key.currency1, data.payer, delta.amount1());

        return abi.encode(delta);
    }

    function _swapExactIn(
        address payer,
        bool zeroForOne,
        uint256 amountIn,
        uint8 actionType
    ) internal returns (BalanceDelta delta) {
        delta = _unlock(CallbackData({
            kind: ActionKind.Swap,
            payer: payer,
            key: poolKey,
            amount0: 0,
            amount1: 0,
            liquidityParams: ModifyLiquidityParams(0, 0, 0, bytes32(0)),
            swapParams: SwapParams({
                zeroForOne: zeroForOne,
                amountSpecified: -int256(amountIn),
                sqrtPriceLimitX96: zeroForOne
                    ? TickMath.MIN_SQRT_PRICE + 1
                    : TickMath.MAX_SQRT_PRICE - 1
            }),
            hookData: abi.encode(payer, actionType)
        }));
        emit PoolAction(payer, actionType, delta);
    }

    function _unlock(CallbackData memory data) internal returns (BalanceDelta delta) {
        delta = abi.decode(poolManager.unlock(abi.encode(data)), (BalanceDelta));
    }

    function _settleDelta(Currency currency, address payer, int128 amount) internal {
        if (amount < 0) {
            uint256 amountToPay = uint256(uint128(-amount));
            poolManager.sync(currency);
            if (!IERC20Minimal(Currency.unwrap(currency)).transferFrom(
                payer,
                address(poolManager),
                amountToPay
            )) revert TransferFailed();
            poolManager.settle();
        } else if (amount > 0) {
            poolManager.take(currency, payer, uint256(uint128(amount)));
        }
    }

    function _amountsForQusd(uint256 amountQusd) internal view returns (uint256 amount0, uint256 amount1) {
        if (Currency.unwrap(poolKey.currency0) == address(qusd)) amount0 = amountQusd;
        else amount1 = amountQusd;
    }

    function _amountsForPair(
        uint256 qusdAmount,
        uint256 agentAmount
    ) internal view returns (uint256 amount0, uint256 amount1) {
        if (Currency.unwrap(poolKey.currency0) == address(qusd)) {
            amount0 = qusdAmount;
            amount1 = agentAmount;
        } else {
            amount0 = agentAmount;
            amount1 = qusdAmount;
        }
    }

    function _sortCurrencies(address tokenA, address tokenB) internal pure returns (Currency, Currency) {
        return tokenA < tokenB
            ? (Currency.wrap(tokenA), Currency.wrap(tokenB))
            : (Currency.wrap(tokenB), Currency.wrap(tokenA));
    }

    function _abs(int256 value) internal pure returns (int256) {
        return value < 0 ? -value : value;
    }
}
