// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "../src/PoolQuestHook.sol";

contract PoolQuestHookTest {
    PoolQuestHook internal hook;
    address internal player = address(0xA11CE);

    constructor() {
        hook = new PoolQuestHook(address(this), address(this), address(0xBEEF));
    }

    function testHappyPathStarts() external {
        hook.enterRun(player);
        hook.afterDonate(player, 1 ether);
        hook.afterAddLiquidity(player, 10 ether, 10 ether);
        hook.afterSwap(player, true, 10 ether, 10 ether);
        require(hook.getProgress(player) == 3, "progress");
    }

    function testHookFlags() external pure {
        require(PoolQuestHook.REQUIRED_HOOK_FLAGS() == 0x0450, "flags");
    }
}
