import chai from "chai";
import { solidity } from "ethereum-waffle";
import { Signer, Wallet } from "ethers";
import { ethers } from "hardhat";

import { deployCounter } from "../scripts/deploy";
import { submitTxWait } from "../scripts/utils";
import { Counter } from "../types";

chai.use(solidity);
const { expect } = chai;

const initCount = 5;

describe("Counter", () => {
    let counter: Counter;

    beforeEach(async () => {
        const signers: Signer[] = await ethers.getSigners();
        counter = await deployCounter(signers[0] as Wallet, undefined, initCount);

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
