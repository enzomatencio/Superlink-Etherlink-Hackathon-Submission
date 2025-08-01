// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockAToken is ERC20 {
    mapping(address => uint256) private _scaledBalances;

    constructor(string memory name, string memory symbol) ERC20(name, symbol) {}

    function setScaledBalance(address user, uint256 balance) external {
        _scaledBalances[user] = balance;
    }

    function scaledBalanceOf(address user) external view returns (uint256) {
        return _scaledBalances[user];
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    function burn(address from, uint256 amount) external {
        _burn(from, amount);
    }
}
