// SPDX-License-Identifier: MIT
pragma solidity >=0.8.17;

/// @title  ICounter
/// @author Solidity Template Authors
/// @notice Increase or decrease a counter.
/// @dev    This is where additional information goes.
interface ICounter {
    /// @notice Increase the counter by 1.
    function incrementCount() external;

    /// @notice Decrease the counter by 1.
    function decrementCount() external;

    /// @notice Get the current counter value.
    /// @return count The current counter value.
    function getCount() external view returns (int256 count);

    /// @notice Sets the current counter value.
    /// @param count The new counter value.
    function setCount(int256 count) external;
}
