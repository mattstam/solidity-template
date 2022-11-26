import hre, { ethers } from "hardhat";

import { VERBOSE } from "../hardhat.config";
import { Counter, Counter__factory } from "../types";
import { deployWait } from "./utils";
import { GasOptions } from "./types";
import { Wallet } from "ethers";

// --- Helper functions for deploying contracts ---

// Also adds them to hardhat-tracer nameTags, which gives them a trackable name
// for events when `npx hardhat test --logs` is used.

// deployCounter deploys the Counter contract with an initial count value.
export async function deployCounter(
    wallet: Wallet,
    gasOpts?: GasOptions,
    initCount?: number,
): Promise<Counter> {
    if (wallet === undefined) {
        wallet = await ethers.getSigners()[0];
    }
    if (initCount === undefined) {
        initCount = 0;
    }

    const counter: Counter__factory = await hre.ethers.getContractFactory(`Counter`, wallet);
    const counterContract = await deployWait(
        counter.deploy(initCount, {
            maxFeePerGas: gasOpts?.maxFeePerGas,
            maxPriorityFeePerGas: gasOpts?.maxPriorityFeePerGas,
            gasLimit: gasOpts?.gasLimit,
        }),
    );

    if (VERBOSE) console.log(`Counter: ${counterContract.address}`);
    hre.tracer.nameTags[counterContract.address] = `Counter`;

    return counterContract;
}
