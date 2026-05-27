// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

error Create2DeployFailed();
error EmptyBytecode();

contract Create2Deployer {
    event Deployed(address indexed deployed, bytes32 indexed salt);

    function deploy(bytes32 salt, bytes memory bytecode) external returns (address deployed) {
        if (bytecode.length == 0) revert EmptyBytecode();
        assembly {
            deployed := create2(0, add(bytecode, 0x20), mload(bytecode), salt)
        }
        if (deployed == address(0)) revert Create2DeployFailed();
        emit Deployed(deployed, salt);
    }

    function compute(bytes32 salt, bytes32 bytecodeHash) external view returns (address) {
        return address(uint160(uint256(keccak256(abi.encodePacked(bytes1(0xff), address(this), salt, bytecodeHash)))));
    }
}
