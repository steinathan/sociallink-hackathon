// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";

/// @title ReputationRegistry
/// @author SocialLink (BuildX AI Season — X Layer, OKX zkEVM L2)
/// @notice On-chain, append-only record of completed-booking reviews. Backend
///         service (ATTESTER_ROLE) attests after a booking settles; client and
///         indexer read `getReputation` to display aggregate rating.
///         Deployed alongside Escrow to X Layer testnet/mainnet.
/// @dev bookingId mapping mirrors `Escrow.sol` — bytes32 derived from the
///      Firestore booking doc id by `keccak256(bytes(bookingId))`.
///
///         ratingSum is stored as `rating * 100` so the aggregate has 2-decimal
///         precision even though ratings are integers in [1, 5]. avgRating is
///         returned in the same units (e.g. avgRating=432 → 4.32 / 5).
contract ReputationRegistry is AccessControl {
    bytes32 public constant ATTESTER_ROLE = keccak256("ATTESTER_ROLE");

    mapping(address => uint256) public attestationCount;
    mapping(address => uint256) public ratingSum;

    /// @dev bookingId => reviewer => attested? prevents double-entries for the
    ///      same booking (a review is one-shot).
    mapping(bytes32 => mapping(address => bool)) public usedByBooking;

    event ReviewAttested(
        address indexed reviewed,
        bytes32 reviewHash,
        bytes32 indexed bookingId,
        uint8 rating,
        uint256 timestamp
    );

    error InvalidRating(uint8 rating);

    constructor(address admin) {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
    }

    /// @notice Attest a completed-booking review.
    /// @param reviewed   address — the user being reviewed (consultant or member)
    /// @param reviewHash bytes32 — content hash of the review (off-chain blob)
    /// @param bookingId  bytes32 — Firestore booking id; one review per booking
    /// @param rating     uint8   — 1..5
    function attestReview(
        address reviewed,
        bytes32 reviewHash,
        bytes32 bookingId,
        uint8 rating
    ) external onlyRole(ATTESTER_ROLE) {
        if (rating < 1 || rating > 5) revert InvalidRating(rating);
        if (usedByBooking[bookingId][reviewed]) {
            // Idempotent: same booking already attested for this subject — skip
            // silently. Backend can re-submit safely.
            return;
        }
        usedByBooking[bookingId][reviewed] = true;
        attestationCount[reviewed] += 1;
        ratingSum[reviewed] += uint256(rating) * 100;

        emit ReviewAttested(reviewed, reviewHash, bookingId, rating, block.timestamp);
    }

    /// @notice Returns `(count, avgRating*100)`. e.g. 1 review of rating 4
    ///         returns `(1, 400)`. No reviews returns `(0, 0)`.
    function getReputation(address reviewed) external view returns (uint256 count, uint256 avgRating) {
        count = attestationCount[reviewed];
        avgRating = count == 0 ? 0 : ratingSum[reviewed] / count;
    }
}
