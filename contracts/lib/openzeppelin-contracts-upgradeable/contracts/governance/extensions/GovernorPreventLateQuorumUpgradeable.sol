// SPDX-License-Identifier: MIT
// OpenZeppelin Contracts (last updated v5.4.0) (governance/extensions/GovernorPreventLateQuorum.sol)

pragma solidity ^0.8.24;

import {GovernorUpgradeable} from "../GovernorUpgradeable.sol";
import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";
import {Initializable} from "../../proxy/utils/Initializable.sol";

/**
 * @dev A module that ensures there is a minimum voting period after quorum is reached. This prevents a large voter from
 * swaying a vote and triggering quorum at the last minute, by ensuring there is always time for other voters to react
 * and try to oppose the decision.
 *
 * If a vote causes quorum to be reached, the proposal's voting period may be extended so that it does not end before at
 * least a specified time has passed (the "vote extension" parameter). This parameter can be set through a governance
 * proposal.
 */
abstract contract GovernorPreventLateQuorumUpgradeable is Initializable, GovernorUpgradeable {
    /// @custom:storage-location erc7201:openzeppelin.storage.GovernorPreventLateQuorum
    struct GovernorPreventLateQuorumStorage {
        uint48 _voteExtension;

        mapping(uint256 proposalId => uint48) _extendedDeadlines;
    }

    // keccak256(abi.encode(uint256(keccak256("openzeppelin.storage.GovernorPreventLateQuorum")) - 1)) & ~bytes32(uint256(0xff))
    bytes32 private constant GovernorPreventLateQuorumStorageLocation = 0x042f525fd47e44d02e065dd7bb464f47b4f926fbd05b5e087891ebd756adf100;

    function _getGovernorPreventLateQuorumStorage() private pure returns (GovernorPreventLateQuorumStorage storage $) {
        assembly {
            $.slot := GovernorPreventLateQuorumStorageLocation
        }
    }

    /// @dev Emitted when a proposal deadline is pushed back due to reaching quorum late in its voting period.
    event ProposalExtended(uint256 indexed proposalId, uint64 extendedDeadline);

    /// @dev Emitted when the {lateQuorumVoteExtension} parameter is changed.
    event LateQuorumVoteExtensionSet(uint64 oldVoteExtension, uint64 newVoteExtension);

    /**
     * @dev Initializes the vote extension parameter: the time in either number of blocks or seconds (depending on the
     * governor clock mode) that is required to pass since the moment a proposal reaches quorum until its voting period
     * ends. If necessary the voting period will be extended beyond the one set during proposal creation.
     */
    function __GovernorPreventLateQuorum_init(uint48 initialVoteExtension) internal onlyInitializing {
        __GovernorPreventLateQuorum_init_unchained(initialVoteExtension);
    }

    function __GovernorPreventLateQuorum_init_unchained(uint48 initialVoteExtension) internal onlyInitializing {
        _setLateQuorumVoteExtension(initialVoteExtension);
    }

    /**
     * @dev Returns the proposal deadline, which may have been extended beyond that set at proposal creation, if the
     * proposal reached quorum late in the voting period. See {Governor-proposalDeadline}.
     */
    function proposalDeadline(uint256 proposalId) public view virtual override returns (uint256) {
        GovernorPreventLateQuorumStorage storage $ = _getGovernorPreventLateQuorumStorage();
        return Math.max(super.proposalDeadline(proposalId), $._extendedDeadlines[proposalId]);
    }

    /**
     * @dev Vote tally updated and detects if it caused quorum to be reached, potentially extending the voting period.
     *
     * May emit a {ProposalExtended} event.
     */
    function _tallyUpdated(uint256 proposalId) internal virtual override {
        GovernorPreventLateQuorumStorage storage $ = _getGovernorPreventLateQuorumStorage();
        super._tallyUpdated(proposalId);
        if ($._extendedDeadlines[proposalId] == 0 && _quorumReached(proposalId)) {
            uint48 extendedDeadline = clock() + lateQuorumVoteExtension();

            if (extendedDeadline > proposalDeadline(proposalId)) {
                emit ProposalExtended(proposalId, extendedDeadline);
            }

            $._extendedDeadlines[proposalId] = extendedDeadline;
        }
    }

    /**
     * @dev Returns the current value of the vote extension parameter: the number of blocks that are required to pass
     * from the time a proposal reaches quorum until its voting period ends.
     */
    function lateQuorumVoteExtension() public view virtual returns (uint48) {
        GovernorPreventLateQuorumStorage storage $ = _getGovernorPreventLateQuorumStorage();
        return $._voteExtension;
    }

    /**
     * @dev Changes the {lateQuorumVoteExtension}. This operation can only be performed by the governance executor,
     * generally through a governance proposal.
     *
     * Emits a {LateQuorumVoteExtensionSet} event.
     */
    function setLateQuorumVoteExtension(uint48 newVoteExtension) public virtual onlyGovernance {
        _setLateQuorumVoteExtension(newVoteExtension);
    }

    /**
     * @dev Changes the {lateQuorumVoteExtension}. This is an internal function that can be exposed in a public function
     * like {setLateQuorumVoteExtension} if another access control mechanism is needed.
     *
     * Emits a {LateQuorumVoteExtensionSet} event.
     */
    function _setLateQuorumVoteExtension(uint48 newVoteExtension) internal virtual {
        GovernorPreventLateQuorumStorage storage $ = _getGovernorPreventLateQuorumStorage();
        emit LateQuorumVoteExtensionSet($._voteExtension, newVoteExtension);
        $._voteExtension = newVoteExtension;
    }
}
