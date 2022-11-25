/* eslint-disable */
import chai from "chai";
import { solidity } from "ethereum-waffle";
import { ethers } from "hardhat";

import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

import { deployCounter } from "../scripts/deploy";
import { submitTxWait } from "../scripts/utils";
import { Counter } from "../types";

chai.use(solidity);
const { expect } = chai;

const initCount = 5;

describe("Counter", () => {
    let counter: Counter;

    beforeEach(async () => {
        const signers: SignerWithAddress[] = await ethers.getSigners();
        counter = await deployCounter(signers[0], null, initCount);

        const currCount = await counter.getCount();
        expect(currCount).to.eq(initCount);
        expect(counter.address).to.properAddress;
    });

    describe("count up and down", async () => {
        it("should succeed increment", async () => {
            await submitTxWait(counter.incrementCount());
            const count = await counter.getCount();
            expect(count).to.eq(initCount + 1);
        });

        it("should succeed decrement", async () => {
            await submitTxWait(counter.decrementCount());
            const count = await counter.getCount();
            expect(count).to.eq(initCount - 1);
        });

        it("should succeed increment then set count", async () => {
            await submitTxWait(counter.incrementCount());
            await submitTxWait(counter.incrementCount());
            await submitTxWait(counter.incrementCount());

            await submitTxWait(counter.setCount(5));

            const count = await counter.getCount();
            expect(count).to.eq(5);
        });

        it("should succeed increment then decrement to get init value", async () => {
            await submitTxWait(counter.incrementCount());
            await submitTxWait(counter.decrementCount());

            const count = await counter.getCount();
            expect(count).to.eq(initCount);
        });
    });
});
