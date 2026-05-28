// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {QuestToken} from "../src/QuestToken.sol";
import {PoolQuestHook} from "../src/PoolQuestHook.sol";
import {PoolQuestRegistry} from "../src/PoolQuestRegistry.sol";
import {PrizeVault} from "../src/PrizeVault.sol";
import {FeeVault} from "../src/FeeVault.sol";
import {PoolQuestRouter} from "../src/PoolQuestRouter.sol";
import {Create2Deployer} from "../src/Create2Deployer.sol";
import {IPoolManager} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";

/// @title Deploy PoolQuest
/// @notice Deploys all PoolQuest contracts to X Layer.
///         Run: forge script script/Deploy.s.sol --rpc-url $RPC_URL --broadcast
contract DeployScript is Script {
    // X Layer PoolManager address
    address constant POOL_MANAGER = 0x360E68faCcca8cA495c1B759Fd9EEe466db9FB32;
    uint160 constant HOOK_PERMISSION_MASK = 0x0550;
    uint160 constant HOOK_PERMISSION_BITS = 0x3fff;

    function run() external {
        uint256 deployerKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address deployer = vm.addr(deployerKey);

        console.log("Deploying from:", deployer);
        console.log("Chain ID:", block.chainid);

        vm.startBroadcast(deployerKey);

        // 1. Deploy QUSD
        QuestToken qusd = new QuestToken("QuestUSD", "QUSD", deployer);
        console.log("QUSD deployed at:", address(qusd));

        QuestToken dragon = new QuestToken("Dragon Pool Token", "DRAGON", deployer);
        console.log("DRAGON deployed at:", address(dragon));

        // 2. Deploy PoolQuestRegistry
        PoolQuestRegistry registry = new PoolQuestRegistry();
        console.log("Registry deployed at:", address(registry));

        // 3. Deploy PrizeVault
        PrizeVault prizeVault = new PrizeVault(address(qusd));
        console.log("PrizeVault deployed at:", address(prizeVault));

        // 4. Deploy FeeVault
        FeeVault feeVault = new FeeVault(address(qusd), address(prizeVault), deployer);
        console.log("FeeVault deployed at:", address(feeVault));

        // 5. Deploy PoolQuestHook at an address carrying the required v4 permission bits.
        Create2Deployer create2Deployer = new Create2Deployer();
        bytes memory hookBytecode = abi.encodePacked(
            type(PoolQuestHook).creationCode,
            abi.encode(IPoolManager(POOL_MANAGER), deployer)
        );
        bytes32 salt = _mineHookSalt(address(create2Deployer), keccak256(hookBytecode));
        PoolQuestHook hook = PoolQuestHook(create2Deployer.deploy(salt, hookBytecode));
        console.log("Hook deployed at:", address(hook));

        // 6. Deploy PoolQuestRouter
        PoolQuestRouter router = new PoolQuestRouter(
            address(qusd), address(dragon), address(hook), address(feeVault), POOL_MANAGER
        );
        console.log("Router deployed at:", address(router));

        // 7. Transfer Hook ownership and grant minter role to router
        hook.transferOwnership(address(router));
        qusd.setMinter(address(router), true);
        dragon.setMinter(address(router), true);
        console.log("Router granted minter role");

        // 8. Register Dragon Agent on-chain
        bytes32 dragonAgentId = keccak256("dragon-pool-v01");
        registry.registerAgent(
            dragonAgentId,
            deployer,
            address(dragon),
            address(qusd),
            address(hook),
            keccak256("pool-id-placeholder"), // replace with real poolId after PoolManager.initialize
            keccak256("rule-hash"),
            keccak256("solution-hash"),
            5 ether,    // entry fee
            80 ether    // prize pool seed
        );
        console.log("Dragon Agent registered on Registry");

        vm.stopBroadcast();

        console.log("\n=== Deployment Summary ===");
        console.log("QUSD:", address(qusd));
        console.log("DRAGON:", address(dragon));
        console.log("Registry:", address(registry));
        console.log("PrizeVault:", address(prizeVault));
        console.log("FeeVault:", address(feeVault));
        console.log("Hook:", address(hook));
        console.log("Router:", address(router));
        console.log("PoolManager:", POOL_MANAGER);
    }

    function _mineHookSalt(
        address deployer,
        bytes32 bytecodeHash
    ) internal pure returns (bytes32) {
        for (uint256 i = 0; i < 1_000_000; i++) {
            bytes32 salt = bytes32(i);
            address candidate = address(uint160(uint256(keccak256(abi.encodePacked(
                bytes1(0xff),
                deployer,
                salt,
                bytecodeHash
            )))));
            if ((uint160(candidate) & HOOK_PERMISSION_BITS) == HOOK_PERMISSION_MASK) {
                return salt;
            }
        }
        revert("No hook salt found");
    }
}
