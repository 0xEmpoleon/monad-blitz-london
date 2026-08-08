// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title MandateExecutor
/// @notice A minimal, deterministic execution judge for delegated native-MON actions.
/// @dev The contract is an unaudited hackathon prototype. Policies are immutable;
///      principals replace a policy by creating a new version and deactivating the old one.
contract MandateExecutor is ReentrancyGuard {
    enum Verdict {
        ALLOW,
        DENY
    }

    enum Reason {
        NONE,
        POLICY_NOT_FOUND,
        POLICY_INACTIVE,
        POLICY_EXPIRED,
        INTENT_EXPIRED,
        WRONG_AGENT,
        TARGET_NOT_ALLOWED,
        SELECTOR_NOT_ALLOWED,
        PER_ACTION_LIMIT,
        EPOCH_LIMIT,
        NONCE_USED,
        INSUFFICIENT_BALANCE,
        CALL_FAILED
    }

    struct PolicyConfig {
        address agent;
        address target;
        bytes4 selector;
        uint128 maxPerAction;
        uint128 maxPerEpoch;
        uint64 epochSeconds;
        uint64 validUntil;
    }

    struct Policy {
        address principal;
        address agent;
        address target;
        bytes4 selector;
        uint128 maxPerAction;
        uint128 maxPerEpoch;
        uint64 epochSeconds;
        uint64 validUntil;
        bool active;
    }

    struct Intent {
        address target;
        uint256 value;
        bytes data;
        uint256 nonce;
        uint64 deadline;
    }

    error InvalidPolicy();
    error NotPrincipal();
    error IntentDenied(Reason reason);
    error ExternalCallFailed(bytes returnData);
    error TransferFailed();

    event PolicyCreated(
        uint256 indexed policyId,
        bytes32 indexed policyHash,
        address indexed principal,
        address agent,
        address target
    );
    event PolicyDeactivated(uint256 indexed policyId);
    event PolicyFunded(uint256 indexed policyId, address indexed funder, uint256 amount);
    event PolicyWithdrawn(
        uint256 indexed policyId,
        address indexed recipient,
        uint256 amount
    );
    event IntentExecuted(
        uint256 indexed policyId,
        bytes32 indexed intentHash,
        uint256 indexed nonce,
        address target,
        bytes4 selector,
        uint256 value,
        uint256 epoch,
        uint256 epochSpendAfter
    );

    uint256 public nextPolicyId = 1;

    mapping(uint256 policyId => Policy policy) public policies;
    mapping(uint256 policyId => uint256 balance) public policyBalances;
    mapping(uint256 policyId => mapping(uint256 epoch => uint256 spend))
        public epochSpend;
    mapping(uint256 policyId => mapping(uint256 nonce => bool used))
        public usedNonces;

    function createPolicy(
        PolicyConfig calldata config
    ) external returns (uint256 policyId) {
        if (
            config.agent == address(0) ||
            config.target == address(0) ||
            config.target == address(this) ||
            config.selector == bytes4(0) ||
            config.maxPerAction == 0 ||
            config.maxPerEpoch == 0 ||
            config.maxPerAction > config.maxPerEpoch ||
            config.epochSeconds == 0 ||
            config.validUntil <= block.timestamp
        ) revert InvalidPolicy();

        policyId = nextPolicyId++;
        policies[policyId] = Policy({
            principal: msg.sender,
            agent: config.agent,
            target: config.target,
            selector: config.selector,
            maxPerAction: config.maxPerAction,
            maxPerEpoch: config.maxPerEpoch,
            epochSeconds: config.epochSeconds,
            validUntil: config.validUntil,
            active: true
        });

        emit PolicyCreated(
            policyId,
            policyHash(policyId),
            msg.sender,
            config.agent,
            config.target
        );
    }

    function deactivatePolicy(uint256 policyId) external {
        Policy storage policy = policies[policyId];
        if (policy.principal != msg.sender) revert NotPrincipal();
        policy.active = false;
        emit PolicyDeactivated(policyId);
    }

    function deposit(uint256 policyId) external payable {
        Policy storage policy = policies[policyId];
        if (policy.principal == address(0) || msg.value == 0) revert InvalidPolicy();
        policyBalances[policyId] += msg.value;
        emit PolicyFunded(policyId, msg.sender, msg.value);
    }

    function withdraw(
        uint256 policyId,
        uint256 amount,
        address payable recipient
    ) external nonReentrant {
        Policy storage policy = policies[policyId];
        if (policy.principal != msg.sender) revert NotPrincipal();
        if (recipient == address(0) || amount > policyBalances[policyId]) {
            revert InvalidPolicy();
        }

        policyBalances[policyId] -= amount;
        (bool success, ) = recipient.call{value: amount}("");
        if (!success) revert TransferFailed();

        emit PolicyWithdrawn(policyId, recipient, amount);
    }

    function previewIntent(
        uint256 policyId,
        Intent calldata intent,
        address candidateAgent
    )
        external
        view
        returns (
            Verdict verdict,
            Reason reason,
            uint256 epoch,
            uint256 projectedSpend,
            bytes32 intentHash_
        )
    {
        (reason, epoch, projectedSpend) = _assess(
            policyId,
            intent,
            candidateAgent
        );
        verdict = reason == Reason.NONE ? Verdict.ALLOW : Verdict.DENY;
        intentHash_ = intentHash(policyId, intent);
    }

    function executeIntent(
        uint256 policyId,
        Intent calldata intent
    ) external nonReentrant returns (bytes memory returnData) {
        (Reason reason, uint256 epoch, uint256 projectedSpend) = _assess(
            policyId,
            intent,
            msg.sender
        );
        if (reason != Reason.NONE) revert IntentDenied(reason);

        usedNonces[policyId][intent.nonce] = true;
        epochSpend[policyId][epoch] = projectedSpend;
        policyBalances[policyId] -= intent.value;

        bytes32 intentHash_ = intentHash(policyId, intent);
        bytes4 selector = _selector(intent.data);

        (bool success, bytes memory result) = intent.target.call{
            value: intent.value
        }(intent.data);
        if (!success) revert ExternalCallFailed(result);

        emit IntentExecuted(
            policyId,
            intentHash_,
            intent.nonce,
            intent.target,
            selector,
            intent.value,
            epoch,
            projectedSpend
        );
        return result;
    }

    function policyHash(uint256 policyId) public view returns (bytes32) {
        Policy storage policy = policies[policyId];
        return
            keccak256(
                abi.encode(
                    block.chainid,
                    address(this),
                    policyId,
                    policy.principal,
                    policy.agent,
                    policy.target,
                    policy.selector,
                    policy.maxPerAction,
                    policy.maxPerEpoch,
                    policy.epochSeconds,
                    policy.validUntil,
                    policy.active
                )
            );
    }

    function intentHash(
        uint256 policyId,
        Intent calldata intent
    ) public view returns (bytes32) {
        return
            keccak256(
                abi.encode(
                    block.chainid,
                    address(this),
                    policyId,
                    intent.target,
                    intent.value,
                    keccak256(intent.data),
                    intent.nonce,
                    intent.deadline
                )
            );
    }

    function currentEpoch(uint256 policyId) external view returns (uint256) {
        Policy storage policy = policies[policyId];
        if (policy.principal == address(0)) return 0;
        return block.timestamp / policy.epochSeconds;
    }

    function _assess(
        uint256 policyId,
        Intent calldata intent,
        address candidateAgent
    )
        internal
        view
        returns (Reason reason, uint256 epoch, uint256 projectedSpend)
    {
        Policy storage policy = policies[policyId];
        if (policy.principal == address(0)) return (Reason.POLICY_NOT_FOUND, 0, 0);
        if (!policy.active) return (Reason.POLICY_INACTIVE, 0, 0);
        if (block.timestamp > policy.validUntil) {
            return (Reason.POLICY_EXPIRED, 0, 0);
        }
        if (block.timestamp > intent.deadline) {
            return (Reason.INTENT_EXPIRED, 0, 0);
        }
        if (candidateAgent != policy.agent) return (Reason.WRONG_AGENT, 0, 0);
        if (intent.target != policy.target) {
            return (Reason.TARGET_NOT_ALLOWED, 0, 0);
        }
        if (_selector(intent.data) != policy.selector) {
            return (Reason.SELECTOR_NOT_ALLOWED, 0, 0);
        }
        if (intent.value > policy.maxPerAction) {
            return (Reason.PER_ACTION_LIMIT, 0, 0);
        }
        if (usedNonces[policyId][intent.nonce]) {
            return (Reason.NONCE_USED, 0, 0);
        }
        if (intent.value > policyBalances[policyId]) {
            return (Reason.INSUFFICIENT_BALANCE, 0, 0);
        }

        epoch = block.timestamp / policy.epochSeconds;
        projectedSpend = epochSpend[policyId][epoch] + intent.value;
        if (projectedSpend > policy.maxPerEpoch) {
            return (Reason.EPOCH_LIMIT, epoch, projectedSpend);
        }

        return (Reason.NONE, epoch, projectedSpend);
    }

    function _selector(bytes calldata data) internal pure returns (bytes4 selector) {
        if (data.length < 4) return bytes4(0);
        assembly ("memory-safe") {
            selector := calldataload(data.offset)
        }
    }
}
