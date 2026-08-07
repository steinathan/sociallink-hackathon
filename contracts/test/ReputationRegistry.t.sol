// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Test} from "forge-std/Test.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {IAccessControl} from "@openzeppelin/contracts/access/IAccessControl.sol";
import {ReputationRegistry} from "../src/ReputationRegistry.sol";

contract ReputationRegistryTest is Test {
    ReputationRegistry registry;

    address admin;
    address attester;
    address stranger;
    address reviewed;

    bytes32 booking1 = keccak256("booking-1");
    bytes32 booking2 = keccak256("booking-2");
    bytes32 hash1 = keccak256("review-content-1");

    function setUp() public {
        admin = makeAddr("admin");
        attester = makeAddr("attester");
        stranger = makeAddr("stranger");
        reviewed = makeAddr("reviewed");

        registry = new ReputationRegistry(admin);

        vm.startPrank(admin);
        registry.grantRole(registry.ATTESTER_ROLE(), attester);
        vm.stopPrank();
    }

    function test_attest_andGetReputation() public {
        vm.prank(attester);
        registry.attestReview(reviewed, hash1, booking1, 5);

        (uint256 count, uint256 avg) = registry.getReputation(reviewed);
        assertEq(count, 1);
        assertEq(avg, 500); // 5.00
        assertEq(registry.attestationCount(reviewed), 1);
        assertEq(registry.ratingSum(reviewed), 500);
    }

    function test_attest_multipleReviews() public {
        vm.startPrank(attester);
        registry.attestReview(reviewed, hash1, booking1, 5);            // 500
        registry.attestReview(reviewed, keccak256("r2"), booking2, 3);  // 300
        vm.stopPrank();

        (uint256 count, uint256 avg) = registry.getReputation(reviewed);
        assertEq(count, 2);
        assertEq(avg, 400); // avg(5,3) = 4.00
    }

    function test_attest_invalidRating_reverts() public {
        vm.prank(attester);
        vm.expectRevert(abi.encodeWithSelector(ReputationRegistry.InvalidRating.selector, 0));
        registry.attestReview(reviewed, hash1, booking1, 0);

        vm.prank(attester);
        vm.expectRevert(abi.encodeWithSelector(ReputationRegistry.InvalidRating.selector, 6));
        registry.attestReview(reviewed, hash1, booking1, 6);
    }

    function test_attest_onlyAttester() public {
        bytes32 role = registry.ATTESTER_ROLE();
        vm.prank(stranger);
        vm.expectRevert(
            abi.encodeWithSelector(IAccessControl.AccessControlUnauthorizedAccount.selector, stranger, role)
        );
        registry.attestReview(reviewed, hash1, booking1, 5);
    }

    function test_attest_idempotent_sameBookingSubject() public {
        vm.startPrank(attester);
        registry.attestReview(reviewed, hash1, booking1, 5);
        registry.attestReview(reviewed, keccak256("r2"), booking1, 1); // same booking, ignored
        vm.stopPrank();

        (uint256 count, uint256 avg) = registry.getReputation(reviewed);
        assertEq(count, 1);
        assertEq(avg, 500);
    }

    function test_event_ReviewAttested_emitted() public {
        vm.expectEmit(true, true, false, true);
        emit ReputationRegistry.ReviewAttested(reviewed, hash1, booking1, 4, block.timestamp);
        vm.prank(attester);
        registry.attestReview(reviewed, hash1, booking1, 4);
    }

    function test_getReputation_emptyReturnsZero() public view {
        (uint256 count, uint256 avg) = registry.getReputation(stranger);
        assertEq(count, 0);
        assertEq(avg, 0);
    }
}
