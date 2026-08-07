// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {Escrow} from "../src/Escrow.sol";
import {ReputationRegistry} from "../src/ReputationRegistry.sol";

/// @notice Deploys Escrow + ReputationRegistry, grants operational roles, and
///         writes addresses to contracts/deployments.json.
///
/// Env (vm.envAddress, all required):
///   ADMIN_ADDRESS       — DEFAULT_ADMIN_ROLE recipient
///   AI_RESOLVER_ADDRESS — AI_RESOLVER_ROLE recipient
///   ATTESTER_ADDRESS    — ATTESTER_ROLE recipient
contract Deploy is Script {
    string constant DEPLOYMENTS_PATH = "./deployments.json";

    function run() external {
        address admin = vm.envAddress("ADMIN_ADDRESS");
        address aiResolver = vm.envAddress("AI_RESOLVER_ADDRESS");
        address attester = vm.envAddress("ATTESTER_ADDRESS");

        vm.startBroadcast();

        Escrow escrow = new Escrow(admin);
        ReputationRegistry reputation = new ReputationRegistry(admin);

        escrow.grantRole(escrow.AI_RESOLVER_ROLE(), aiResolver);
        reputation.grantRole(reputation.ATTESTER_ROLE(), attester);

        vm.stopBroadcast();

        string memory chainKey = block.chainid == 195 ? "testnet" : "mainnet";

        // Read existing JSON object (or start fresh). Keys: chainKey -> {escrow, reputation}.
        string memory root = vm.isFile(DEPLOYMENTS_PATH) ? vm.readFile(DEPLOYMENTS_PATH) : "{}";
        root = vm.serializeAddress(root, _join(".", chainKey, "escrow"), address(escrow));
        root = vm.serializeAddress(root, _join(".", chainKey, "reputation"), address(reputation));

        vm.writeJson(root, DEPLOYMENTS_PATH);

        console2.log("Escrow deployed:        ", address(escrow));
        console2.log("Reputation deployed:    ", address(reputation));
        console2.log("Chain:                  ", chainKey);
        console2.log("Wrote:                  ", DEPLOYMENTS_PATH);
    }

    /// @dev Builds a dotted path for vm.serialize*: "<key>.<subkey>".
    function _join(string memory a, string memory b, string memory c) internal pure returns (string memory) {
        return string.concat(a, ".", b, ".", c);
    }
}
