// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {PoolQuestHook} from "../src/PoolQuestHook.sol";
import {PoolQuestRegistry} from "../src/PoolQuestRegistry.sol";
import {QuestToken} from "../src/QuestToken.sol";
import {IPoolManager} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";

contract PoolQuestHookTest is Test {
    PoolQuestHook public hook;
    PoolQuestRegistry public registry;
    QuestToken public qusd;
    address public player = address(0x1234);
    address public creator = address(0xABCD);

    function setUp() public {
        qusd = new QuestToken("QuestUSD", "QUSD", address(this));
        hook = new PoolQuestHook(IPoolManager(address(this)), address(this));
        registry = new PoolQuestRegistry();
    }

    function testStartRun() public {
        bytes32 ruleHash = keccak256("test_rule");
        hook.startRun(player, 5, ruleHash);

        PoolQuestHook.Run memory run = hook.getRun(player);
        assertTrue(run.active);
        assertEq(run.progress, 0);
        assertEq(run.totalSteps, 5);
        assertEq(run.ruleHash, ruleHash);
    }

    function testStartRunRevertsIfAlreadyActive() public {
        bytes32 ruleHash = keccak256("test_rule");
        hook.startRun(player, 5, ruleHash);
        vm.expectRevert(PoolQuestHook.RunAlreadyActive.selector);
        hook.startRun(player, 5, ruleHash);
    }

    function testRecordHint() public {
        hook.startRun(player, 5, keccak256("r"));
        hook.recordHint(player, 1, 0.2 ether, 50);
        PoolQuestHook.Run memory run = hook.getRun(player);
        assertEq(run.hintCount, 1);
        assertEq(run.hintPenalty, 50);
    }

    function testConfirmProgress() public {
        hook.startRun(player, 5, keccak256("r"));
        hook.confirmProgress(player, 1, keccak256("step1"));
        assertEq(hook.getProgress(player), 1);
    }

    function testCompleteOnFinalStep() public {
        hook.startRun(player, 2, keccak256("r"));
        hook.confirmProgress(player, 1, keccak256("s1"));
        hook.confirmProgress(player, 2, keccak256("s2"));
        PoolQuestHook.Run memory run = hook.getRun(player);
        assertTrue(run.completed);
    }

    function testRegistry() public {
        bytes32 agentId = keccak256("dragon");
        registry.registerAgent(
            agentId, creator, address(0x1111), address(qusd),
            address(hook), bytes32(0), keccak256("r"), keccak256("s"),
            5 ether, 80 ether
        );
        assertTrue(registry.isRegistered(agentId));
        PoolQuestRegistry.AgentRecord memory rec = registry.getAgent(agentId);
        assertEq(rec.creator, creator);
    }
}
