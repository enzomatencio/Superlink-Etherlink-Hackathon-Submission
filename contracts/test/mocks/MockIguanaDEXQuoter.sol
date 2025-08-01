// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "../../src/interfaces/IIguanaDEXRouter.sol";

contract MockIguanaDEXQuoter {
    uint256 public slippage = 0;

    function setSlippage(uint256 _slippage) external {
        slippage = _slippage;
    }

    function quoteExactInputSingle(IIguanaDEXQuoter.QuoteExactInputSingleParams calldata params)
        external
        view
        returns (uint256 amountOut, uint160, uint32, uint256)
    {
        amountOut = params.amountIn * (10000 - slippage) / 10000;
        return (amountOut, 0, 0, 0);
    }
}
