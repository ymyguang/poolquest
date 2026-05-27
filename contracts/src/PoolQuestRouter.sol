// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {QuestToken} from "./QuestToken.sol";
import {PoolQuestHook} from "./PoolQuestHook.sol";

error NotEntered();
error TransferFailed();

contract PoolQuestRouter {
    uint256 public constant ENTRY_FEE_QUSD = 1 ether;
    uint256 public constant DEMO_QUSD_GRANT = 100 ether;
    uint256 public constant DEMO_DRAGON_GRANT = 25 ether;

    QuestToken public immutable qusd;
    QuestToken public immutable dragon;
    PoolQuestHook public immutable hook;
    address public immutable poolManager;
    bytes32 public poolId;

    event DemoFundsClaimed(address indexed player, uint256 qusdAmount, uint256 dragonAmount);
    event PoolIdUpdated(bytes32 indexed poolId);

    constructor(
        QuestToken qusdToken,
        QuestToken dragonToken,
        PoolQuestHook questHook,
        address v4PoolManager,
        bytes32 initialPoolId
    ) {
        qusd = qusdToken;
        dragon = dragonToken;
        hook = questHook;
        poolManager = v4PoolManager;
        poolId = initialPoolId;
    }

    function setPoolId(bytes32 nextPoolId) external {
        if (msg.sender != hook.creator()) revert TransferFailed();
        poolId = nextPoolId;
        emit PoolIdUpdated(nextPoolId);
    }

    function claimDemoFunds() external {
        qusd.mint(msg.sender, DEMO_QUSD_GRANT);
        dragon.mint(msg.sender, DEMO_DRAGON_GRANT);
        emit DemoFundsClaimed(msg.sender, DEMO_QUSD_GRANT, DEMO_DRAGON_GRANT);
    }

    function enterRun() external {
        _pull(qusd, msg.sender, address(this), ENTRY_FEE_QUSD);
        hook.enterRun(msg.sender);
    }

    function donate(uint256 amount) external {
        _pull(qusd, msg.sender, address(this), amount);
        hook.afterDonate(msg.sender, amount);
    }

    function addDemoLiquidity(uint256 qusdAmount, uint256 dragonAmount) external {
        _pull(qusd, msg.sender, address(this), qusdAmount);
        _pull(dragon, msg.sender, address(this), dragonAmount);
        hook.afterAddLiquidity(msg.sender, qusdAmount, dragonAmount);
    }

    function swapDemo(bool buyDragon, uint256 amountIn) external {
        if (buyDragon) {
            _pull(qusd, msg.sender, address(this), amountIn);
            uint256 amountOut = amountIn;
            dragon.mint(msg.sender, amountOut);
            hook.afterSwap(msg.sender, true, amountIn, amountOut);
        } else {
            _pull(dragon, msg.sender, address(this), amountIn);
            uint256 amountOut = amountIn;
            qusd.mint(msg.sender, amountOut);
            hook.afterSwap(msg.sender, false, amountIn, amountOut);
        }
    }

    function claimHold() external {
        hook.claimHold(msg.sender);
    }

    function askHint(uint8 level) external returns (uint256 feeQusd, int256 penalty) {
        (feeQusd, penalty) = hook.askHintFor(msg.sender, level);
        _pull(dragon, msg.sender, address(this), feeQusd);
    }

    function _pull(QuestToken token, address from, address to, uint256 amount) internal {
        bool ok = token.transferFrom(from, to, amount);
        if (!ok) revert TransferFailed();
    }
}
