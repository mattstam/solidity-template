// SPDX-License-Identifier: MIT
pragma solidity >=0.8.17;

import {Test} from "./utils/Test.sol";
import {Counter} from "../Counter.sol";

contract CounterTest is Test {
    Counter counter;

    function setUp() public {
        counter = new Counter(5);
    }

    function testIncrement() public {
        counter.incrementCount();
        counter.incrementCount();
        int256 value = counter.getCount();
        assertEq(value, 7);
        emit log_int(value);
    }

    function testDecrement() public {
        counter.decrementCount();
        int256 value = counter.getCount();
        assertEq(value, 4);
        emit log_int(value);
    }

    function testGetCount() public {
        int256 value = counter.getCount();
        assertEq(value, 5);
        emit log_int(value);
    }

    function testSetCount() public {
        counter.setCount(10);
        int256 value = counter.getCount();
        assertEq(value, 10);
        emit log_int(value);
    }

    function testSetCountAfterIncrement() public {
        counter.incrementCount();
        counter.incrementCount();
        counter.incrementCount();

        counter.setCount(3);
        int256 value = counter.getCount();
        assertEq(value, 3);
        emit log_int(value);
    }
}
