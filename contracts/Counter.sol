// SPDX-License-Identifier: MIT
pragma solidity >=0.8.17;

import {ICounter} from "./interfaces/ICounter.sol";

/// @title  Counter
/// @author Solidity Template Authors
contract Counter is ICounter {
    int256 private count;

    constructor(int256 _count) {
        count = _count;
    }

    /// @inheritdoc ICounter
    function incrementCount() external {
        count += 1;
    }

    /// @inheritdoc ICounter
    function decrementCount() external {
        count -= 1;
    }

    /// @inheritdoc ICounter
    function getCount() external view returns (int256 count_) {
        return count;
    }

    /// @inheritdoc ICounter
    function setCount(int256 count_) external {
        count = count_;
    }
}
