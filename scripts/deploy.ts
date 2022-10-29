import hre, { ethers } from "hardhat";

import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

import { VERBOSE } from "../hardhat.config";
import { Counter, Counter__factory } from "../types";
import { deployWait } from "./utils";

// --- Helper functions for deploying contracts ---

// Also adds them to hardhat-tracer nameTags, which gives them a trackable name
// for events when `npx hardhat test --logs` is used.

// deployCounter deploys the Counter contract with an initial count value.
export async function deployCounter(
    deployer?: SignerWithAddress,
    initCount?: number,
): Promise<Counter> {
    if (deployer == undefined) {
        deployer = (await ethers.getSigners())[0];
    }
    if (initCount == undefined) {
        initCount = 0;
    }

    const counter: Counter__factory = await hre.ethers.getContractFactory(`Counter`, deployer);
    const counterContract = await deployWait(counter.deploy(initCount));

    if (VERBOSE) console.log(`Counter: ${counterContract.address}`);
    hre.tracer.nameTags[counterContract.address] = `Counter`;

    return counterContract;
}
