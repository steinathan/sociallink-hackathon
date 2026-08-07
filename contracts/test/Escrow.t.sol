// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Test, console2} from "forge-std/Test.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {IAccessControl} from "@openzeppelin/contracts/access/IAccessControl.sol";
import {Escrow} from "../src/Escrow.sol";

/// @dev Minimal mintable ERC20 for tests (USDC has 6 decimals on X Layer).
contract MockUSDC is ERC20 {
    constructor() ERC20("USD Coin", "USDC") {}
    function mint(address to, uint256 amount) external { _mint(to, amount); }
    function decimals() public pure override returns (uint8) { return 6; }
}

contract EscrowTest is Test {
    Escrow escrow;
    MockUSDC usdc;

    address admin;
    address aiResolver;
    address member;
    address consultant;
    address stranger;

    bytes32 bookingId = keccak256("booking-1");
    uint256 constant AMOUNT = 100e6; // 100 USDC
    uint64 releaseAfter;

    function setUp() public {
        admin = makeAddr("admin");
        aiResolver = makeAddr("aiResolver");
        member = makeAddr("member");
        consultant = makeAddr("consultant");
        stranger = makeAddr("stranger");

        usdc = new MockUSDC();
        escrow = new Escrow(admin);

        vm.startPrank(admin);
        escrow.grantRole(escrow.AI_RESOLVER_ROLE(), aiResolver);
        vm.stopPrank();

        releaseAfter = uint64(block.timestamp + 1 days);

        usdc.mint(member, AMOUNT * 10);
        vm.prank(member);
        usdc.approve(address(escrow), type(uint256).max);
    }

    // ─── Happy path ───────────────────────────────────────────────────────────
    function test_createFundRelease_happyPath() public {
        vm.prank(member);
        bytes32 eid = escrow.createEscrow(bookingId, consultant, address(usdc), AMOUNT, releaseAfter);
        assertEq(eid, bookingId);
        assertTrue(escrow.exists(eid));

        vm.prank(member);
        escrow.fundEscrow(eid);
        assertEq(usdc.balanceOf(address(escrow)), AMOUNT);

        vm.prank(member);
        escrow.release(eid);

        assertEq(escrow.statusOf(eid), uint8(Escrow.EscrowStatus.RELEASED));
        assertEq(usdc.balanceOf(consultant), AMOUNT);
        assertEq(usdc.balanceOf(address(escrow)), 0);
    }

    // ─── Refund path ──────────────────────────────────────────────────────────
    function test_refund_memberOnly() public {
        _fundedEscrow();

        // Stranger cannot refund.
        vm.prank(stranger);
        vm.expectRevert(Escrow.NotParty.selector);
        escrow.refund(bookingId);

        vm.prank(member);
        escrow.refund(bookingId);

        assertEq(escrow.statusOf(bookingId), uint8(Escrow.EscrowStatus.REFUNDED));
        assertEq(usdc.balanceOf(member), AMOUNT * 10); // never debited from balance net
    }

    // ─── Dispute → resolve path ───────────────────────────────────────────────
    function test_dispute_resolve_split() public {
        _fundedEscrow();

        vm.prank(consultant);
        escrow.dispute(bookingId);
        assertEq(escrow.statusOf(bookingId), uint8(Escrow.EscrowStatus.DISPUTED));

        // 60% to consultant, 40% to member.
        vm.prank(aiResolver);
        escrow.resolveDispute(bookingId, consultant, 6000);

        assertEq(escrow.statusOf(bookingId), uint8(Escrow.EscrowStatus.RESOLVED));
        assertEq(usdc.balanceOf(consultant), (AMOUNT * 6000) / 10_000);
        assertEq(usdc.balanceOf(member), AMOUNT * 10 - (AMOUNT * 6000) / 10_000);
        // Auto-generated getter returns tuple in struct-declaration order; resolver is index 7.
        (, , , , , , , address resolver) = escrow.escrows(bookingId);
        assertEq(resolver, aiResolver);
    }

    function test_resolveDispute_onlyResolver() public {
        _fundedEscrow();
        vm.prank(consultant);
        escrow.dispute(bookingId);

        bytes32 role = escrow.AI_RESOLVER_ROLE();
        vm.prank(stranger);
        vm.expectRevert(
            abi.encodeWithSelector(IAccessControl.AccessControlUnauthorizedAccount.selector, stranger, role)
        );
        escrow.resolveDispute(bookingId, consultant, 10_000);
    }

    function test_resolveDispute_invalidSplit_reverts() public {
        _fundedEscrow();
        vm.prank(consultant);
        escrow.dispute(bookingId);

        vm.prank(aiResolver);
        vm.expectRevert(Escrow.InvalidSplit.selector);
        escrow.resolveDispute(bookingId, consultant, 10_001);
    }

    function test_resolveDispute_winnerMustBeParty() public {
        _fundedEscrow();
        vm.prank(consultant);
        escrow.dispute(bookingId);

        vm.prank(aiResolver);
        vm.expectRevert(Escrow.NotParty.selector);
        escrow.resolveDispute(bookingId, stranger, 5000);
    }

    // ─── Access control ───────────────────────────────────────────────────────
    function test_release_timelockPermissionless() public {
        _fundedEscrow();

        vm.prank(stranger);
        vm.expectRevert(
            abi.encodeWithSelector(Escrow.TimelockNotReached.selector, releaseAfter)
        );
        escrow.release(bookingId);

        vm.warp(releaseAfter);
        vm.prank(stranger);
        escrow.release(bookingId);

        assertEq(escrow.statusOf(bookingId), uint8(Escrow.EscrowStatus.RELEASED));
        assertEq(usdc.balanceOf(consultant), AMOUNT);
    }

    function test_release_afterRefund_reverts() public {
        _fundedEscrow();
        vm.prank(member);
        escrow.refund(bookingId);

        vm.prank(member);
        vm.expectRevert(
            abi.encodeWithSelector(Escrow.InvalidStatus.selector, uint8(Escrow.EscrowStatus.REFUNDED))
        );
        escrow.release(bookingId);
    }

    function test_fundEscrow_onlyMember() public {
        vm.prank(member);
        escrow.createEscrow(bookingId, consultant, address(usdc), AMOUNT, releaseAfter);

        vm.prank(stranger);
        vm.expectRevert(Escrow.NotParty.selector);
        escrow.fundEscrow(bookingId);
    }

    function test_createEscrow_zeroAddress_reverts() public {
        vm.prank(member);
        vm.expectRevert(Escrow.ZeroAddress.selector);
        escrow.createEscrow(bookingId, address(0), address(usdc), AMOUNT, releaseAfter);

        vm.prank(member);
        vm.expectRevert(Escrow.ZeroAddress.selector);
        escrow.createEscrow(bookingId, consultant, address(0), AMOUNT, releaseAfter);
    }

    function test_createEscrow_duplicateBooking_reverts() public {
        vm.startPrank(member);
        escrow.createEscrow(bookingId, consultant, address(usdc), AMOUNT, releaseAfter);
        vm.expectRevert(Escrow.EscrowAlreadyExists.selector);
        escrow.createEscrow(bookingId, consultant, address(usdc), AMOUNT, releaseAfter);
        vm.stopPrank();
    }

    function test_createEscrow_zeroAmount_reverts() public {
        vm.prank(member);
        vm.expectRevert(Escrow.AmountZero.selector);
        escrow.createEscrow(bookingId, consultant, address(usdc), 0, releaseAfter);
    }

    function test_dispute_notParty_reverts() public {
        _fundedEscrow();
        vm.prank(stranger);
        vm.expectRevert(Escrow.NotParty.selector);
        escrow.dispute(bookingId);
    }

    // ─── Events ───────────────────────────────────────────────────────────────
    function test_event_EscrowReleased_emitted() public {
        _fundedEscrow();

        vm.expectEmit(true, true, false, true);
        emit Escrow.EscrowReleased(bookingId, consultant, AMOUNT);
        vm.prank(member);
        escrow.release(bookingId);
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────
    function _fundedEscrow() internal {
        vm.prank(member);
        escrow.createEscrow(bookingId, consultant, address(usdc), AMOUNT, releaseAfter);
        vm.prank(member);
        escrow.fundEscrow(bookingId);
    }
}
