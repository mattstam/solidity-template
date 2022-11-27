import hre from "hardhat";

import { chainIds, VERBOSE, ZK_EVM } from "../hardhat.config";
import { Counter, Counter__factory } from "../types";
import { deployWait } from "./utils";
import { GasOptions } from "./types";
import { Wallet } from "ethers";

import { Deployer as zkDeployer } from "@matterlabs/hardhat-zksync-deploy";

// --- Helper functions for deploying contracts ---

// Also adds them to hardhat-tracer nameTags, which gives them a trackable name
// for events when `npx hardhat test --logs` is used.

// deployCounter deploys the Counter contract with an initial count value.
export async function deployCounter(
    wallet: Wallet,
    gasOpts?: GasOptions,
    initCount?: number,
): Promise<Counter> {
    if (initCount === undefined) {
        initCount = 0;
    }

    let counterContract: Counter;
    if (await isZkDeployment(wallet)) {
        const deployer = zkDeployer.fromEthWallet(hre, wallet);
        const zkArtifact = await deployer.loadArtifact(`Counter`);
        counterContract = (await deployWait(
            deployer.deploy(zkArtifact, [initCount], {
                maxFeePerGas: gasOpts?.maxFeePerGas,
                maxPriorityFeePerGas: gasOpts?.maxPriorityFeePerGas,
                gasLimit: gasOpts?.gasLimit,
            }),
        )) as Counter;
    } else {
        const counter: Counter__factory = await hre.ethers.getContractFactory(`Counter`, wallet);
        counterContract = await deployWait(
            counter.deploy(initCount, {
                maxFeePerGas: gasOpts?.maxFeePerGas,
                maxPriorityFeePerGas: gasOpts?.maxPriorityFeePerGas,
                gasLimit: gasOpts?.gasLimit,
            }),
        );
    }

    if (VERBOSE) console.log(`Counter: ${counterContract.address}`);
    hre.tracer.nameTags[counterContract.address] = `Counter`;

    return counterContract;
}

// isZkDeployment returns if ZK_EVM is true and the network is a supported zk rollup.
async function isZkDeployment(wallet: Wallet): Promise<boolean> {
    const net = await wallet.provider.getNetwork();
    return (
        ZK_EVM &&
        (net.chainId === chainIds[`zksync-mainnet`] || net.chainId === chainIds[`zksync-goerli`])
    );
}
