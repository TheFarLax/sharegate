// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract ShareGate {
    struct Share {
        address owner;
        uint256 expiry;
    }

    mapping(bytes32 => Share) public shares;
    mapping(bytes32 => mapping(address => bool)) public access;

    function createShare(bytes32 shareId, uint256 expiry) external {
        require(shares[shareId].owner == address(0), "Already exists");

        shares[shareId] = Share(msg.sender, expiry);
        access[shareId][msg.sender] = true;
    }

    function grantAccess(bytes32 shareId, address user) external {
        require(msg.sender == shares[shareId].owner, "Not owner");
        access[shareId][user] = true;
    }

    function revokeAccess(bytes32 shareId, address user) external {
        require(msg.sender == shares[shareId].owner, "Not owner");
        access[shareId][user] = false;
    }

    function canAccess(bytes32 shareId, address user) external view returns (bool) {
        Share memory s = shares[shareId];

        if (s.expiry != 0 && block.timestamp > s.expiry) {
            return false;
        }

        return access[shareId][user];
    }
}
