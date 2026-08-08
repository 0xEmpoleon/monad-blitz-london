// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @title DemoMarket
/// @notice A tiny payable venue used to prove policy enforcement during the Blitz.
contract DemoMarket {
    event Purchased(
        address indexed buyer,
        bytes32 indexed assetId,
        uint256 amount
    );

    mapping(bytes32 assetId => uint256 volume) public volumeByAsset;

    function buy(bytes32 assetId) external payable returns (uint256 newVolume) {
        require(msg.value > 0, "zero value");
        newVolume = volumeByAsset[assetId] + msg.value;
        volumeByAsset[assetId] = newVolume;
        emit Purchased(msg.sender, assetId, msg.value);
    }
}

contract FailingMarket {
    error AlwaysFails();

    function buy(bytes32) external payable {
        revert AlwaysFails();
    }
}
