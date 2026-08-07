// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/// @title Escrow
/// @author SocialLink (BuildX AI Season — X Layer, OKX zkEVM L2)
/// @notice ERC20 escrow for SocialLink bookings. Locks member funds in USDC,
///         releases to consultant (or refunds member), with an AI resolver
///         role for dispute splits. Deployed to X Layer testnet/mainnet.
/// @dev bookingId ↔ escrowId mapping:
///      - Firestore `bookings/{bookingId}` doc id is a string (e.g. "kQ3x...").
///      - Off-chain code converts the string to bytes32 by hashing it:
///            keccak256(bytes(bookingId))  // canonical mapping
///      - Or by left-padding the first 32 bytes if shorter (string → bytes32).
///      - Pass that bytes32 as both `bookingId` and `escrowId` — they are 1:1.
///      - Optimized for X Layer (Polygon CDK): minimal sstore, SafeERC20 over
///        cheap transfers, near-zero gas so on-chain escrow cost is trivial.
contract Escrow is AccessControl, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ─── Roles ────────────────────────────────────────────────────────────────
    bytes32 public constant AI_RESOLVER_ROLE = keccak256("AI_RESOLVER_ROLE");

    // ─── Status ───────────────────────────────────────────────────────────────
    enum EscrowStatus {
        ACTIVE,    // funded, waiting for release or refund
        RELEASED,  // paid out to consultant
        REFUNDED,  // returned to member
        DISPUTED,  // one or both parties opened a dispute
        RESOLVED   // AI_RESOLVER_ROLE split funds
    }

    // ─── Storage ──────────────────────────────────────────────────────────────
    struct EscrowData {
        address member;        // funder
        address consultant;    // payee
        address token;         // ERC20 (USDC on X Layer)
        uint256 amount;        // locked principal
        uint8 status;          // EscrowStatus enum
        uint64 createdAt;
        uint64 releaseAfter;   // unix timestamp; anyone can release after this
        address resolver;      // AI_RESOLVER_ROLE address that resolved (0 if n/a)
    }

    mapping(bytes32 => EscrowData) public escrows;
    mapping(bytes32 => bool) public exists;

    // ─── Events ───────────────────────────────────────────────────────────────
    event EscrowCreated(
        bytes32 indexed bookingId,
        address indexed member,
        address indexed consultant,
        address token,
        uint256 amount,
        uint64 releaseAfter
    );
    event EscrowFunded(bytes32 indexed bookingId, address indexed member, uint256 amount);
    event EscrowReleased(bytes32 indexed bookingId, address indexed consultant, uint256 amount);
    event EscrowRefunded(bytes32 indexed bookingId, address indexed member, uint256 amount);
    event EscrowDisputed(bytes32 indexed bookingId, address indexed caller);
    event EscrowResolved(
        bytes32 indexed bookingId,
        address winner,
        uint256 memberAmount,
        uint256 consultantAmount
    );

    // ─── Errors ───────────────────────────────────────────────────────────────
    error EscrowAlreadyExists();
    error EscrowNotFound();
    error EscrowAlreadyFunded();
    error InvalidStatus(uint8 status);
    error NotParty();
    error TimelockNotReached(uint64 releaseAfter);
    error AmountZero();
    error ZeroAddress();
    error InvalidSplit();

    // ─── Construction ─────────────────────────────────────────────────────────
    constructor(address admin) {
        if (admin == address(0)) revert ZeroAddress();
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
    }

    // ─── Escrow lifecycle ─────────────────────────────────────────────────────

    /// @notice Stage an escrow for a booking. Escrow is unfunded until
    ///         `fundEscrow` pulls tokens from the member.
    /// @param bookingId       bytes32 — Firestore booking doc id
    /// @param consultant      address — payee
    /// @param token           address — ERC20 token (USDC on X Layer)
    /// @param amount          uint256 — principal
    /// @param releaseAfter    uint64  — unix timestamp; anyone can release after
    /// @return escrowId       bytes32 — equals bookingId
    function createEscrow(
        bytes32 bookingId,
        address consultant,
        address token,
        uint256 amount,
        uint64 releaseAfter
    ) external returns (bytes32 escrowId) {
        if (consultant == address(0) || token == address(0)) revert ZeroAddress();
        if (amount == 0) revert AmountZero();
        if (exists[bookingId]) revert EscrowAlreadyExists();

        escrowId = bookingId;
        escrows[escrowId] = EscrowData({
            member: msg.sender,
            consultant: consultant,
            token: token,
            amount: amount,
            status: uint8(EscrowStatus.ACTIVE),
            createdAt: uint64(block.timestamp),
            releaseAfter: releaseAfter,
            resolver: address(0)
        });
        exists[escrowId] = true;

        emit EscrowCreated(escrowId, msg.sender, consultant, token, amount, releaseAfter);
    }

    /// @notice Pull `escrow.amount` of `escrow.token` from `msg.sender` into the
    ///         contract. Caller must be the escrow member and have approved the
    ///         contract to spend `amount` of `token`.
    function fundEscrow(bytes32 escrowId) external nonReentrant {
        EscrowData storage e = _mustExist(escrowId);
        if (msg.sender != e.member) revert NotParty();
        if (e.status != uint8(EscrowStatus.ACTIVE)) revert InvalidStatus(e.status);

        IERC20(e.token).safeTransferFrom(msg.sender, address(this), e.amount);

        emit EscrowFunded(escrowId, msg.sender, e.amount);
    }

    /// @notice Release escrow to the consultant.
    ///         Callable by the member at any time, or by anyone after
    ///         `releaseAfter` timelock elapses.
    function release(bytes32 escrowId) external nonReentrant {
        EscrowData storage e = _mustExist(escrowId);
        if (e.status != uint8(EscrowStatus.ACTIVE)) revert InvalidStatus(e.status);

        bool isMember = msg.sender == e.member;
        bool timelockPassed = block.timestamp >= e.releaseAfter;
        if (!isMember && !timelockPassed) revert TimelockNotReached(e.releaseAfter);

        e.status = uint8(EscrowStatus.RELEASED);
        uint256 amount = e.amount;
        e.amount = 0;

        IERC20(e.token).safeTransfer(e.consultant, amount);

        emit EscrowReleased(escrowId, e.consultant, amount);
    }

    /// @notice Refund the escrow back to the member. Only the member may call,
    ///         only while status is ACTIVE.
    function refund(bytes32 escrowId) external nonReentrant {
        EscrowData storage e = _mustExist(escrowId);
        if (msg.sender != e.member) revert NotParty();
        if (e.status != uint8(EscrowStatus.ACTIVE)) revert InvalidStatus(e.status);

        e.status = uint8(EscrowStatus.REFUNDED);
        uint256 amount = e.amount;
        e.amount = 0;

        IERC20(e.token).safeTransfer(e.member, amount);

        emit EscrowRefunded(escrowId, e.member, amount);
    }

    /// @notice Open a dispute. Either party may call; status must be ACTIVE.
    function dispute(bytes32 escrowId) external {
        EscrowData storage e = _mustExist(escrowId);
        if (msg.sender != e.member && msg.sender != e.consultant) revert NotParty();
        if (e.status != uint8(EscrowStatus.ACTIVE)) revert InvalidStatus(e.status);

        e.status = uint8(EscrowStatus.DISPUTED);
        emit EscrowDisputed(escrowId, msg.sender);
    }

    /// @notice AI resolver splits escrow between member and consultant.
    ///         `winner` must be either the member or the consultant; `splitBps`
    ///         is the share (in basis points, max 10_000) going to the winner.
    ///         Remaining share goes to the counterparty.
    function resolveDispute(
        bytes32 escrowId,
        address winner,
        uint16 splitBps
    ) external onlyRole(AI_RESOLVER_ROLE) nonReentrant {
        EscrowData storage e = _mustExist(escrowId);
        if (e.status != uint8(EscrowStatus.DISPUTED)) revert InvalidStatus(e.status);
        if (splitBps > 10_000) revert InvalidSplit();
        if (winner != e.member && winner != e.consultant) revert NotParty();

        address counterparty = winner == e.member ? e.consultant : e.member;
        uint256 amount = e.amount;
        uint256 winnerAmount = (amount * splitBps) / 10_000;
        uint256 counterpartyAmount = amount - winnerAmount;

        e.status = uint8(EscrowStatus.RESOLVED);
        e.amount = 0;
        e.resolver = msg.sender;

        // Pay counterparty first (CEI: transfer winner last to avoid surfacing
        // an obvious re-entrancy hook to the winning party).
        if (counterpartyAmount > 0) {
            IERC20(e.token).safeTransfer(counterparty, counterpartyAmount);
        }
        if (winnerAmount > 0) {
            IERC20(e.token).safeTransfer(winner, winnerAmount);
        }

        emit EscrowResolved(escrowId, winner, winner == e.member ? winnerAmount : counterpartyAmount, winner == e.consultant ? winnerAmount : counterpartyAmount);
    }

    // ─── Views ────────────────────────────────────────────────────────────────

    function getEscrow(bytes32 escrowId) external view returns (EscrowData memory) {
        return escrows[escrowId];
    }

    function statusOf(bytes32 escrowId) external view returns (uint8) {
        return escrows[escrowId].status;
    }

    // ─── Internal ─────────────────────────────────────────────────────────────

    function _mustExist(bytes32 escrowId) internal view returns (EscrowData storage) {
        if (!exists[escrowId]) revert EscrowNotFound();
        return escrows[escrowId];
    }
}
