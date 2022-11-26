import { BigNumber, Contract, ContractTransaction, utils, Wallet } from "ethers";
import * as fs from "fs";
import { ethers, network } from "hardhat";
import * as path from "path";
import { keyInSelect, keyInYNStrict, question } from "readline-sync";
import { Counter } from "../types";
import { deployCounter } from "./deploy";
import { chainIds, explorerUrl, GAS_MODE, UrlType } from "../hardhat.config";
import { Deployment, DeploymentContract, Deployments, GasOptions } from "./types";
import { FeeData } from "@ethersproject/providers";
import { HardhatNetworkHDAccountsConfig } from "hardhat/types";

async function main(wallet?: Wallet, gasOpts?: GasOptions): Promise<void> {
    if (wallet === undefined) {
        wallet = await askForWallet();
    }
    if (GAS_MODE && gasOpts === undefined) {
        gasOpts = await askForGasOptions();
    }

    switch (askForUsage()) {
        case Usage.DEPLOY: {
            await trackDeployment(() => deployCounter(wallet!, gasOpts, 0), `Counter`);
            void main(wallet, gasOpts);
            break;
        }
        case Usage.CALL: {
            const addr = askForContract(`Counter`);
            const counter: Counter = await ethers.getContractAt(`Counter`, addr);

            let tx: ContractTransaction | undefined = undefined;
            let count: BigNumber;
            switch (askFor(`function call`)) {
                case `incrementCount`:
                    tx = await counter.incrementCount({
                        maxFeePerGas: gasOpts?.maxFeePerGas,
                        maxPriorityFeePerGas: gasOpts?.maxPriorityFeePerGas,
                        gasLimit: gasOpts?.gasLimit,
                    });
                    break;
                case `decrementCount`:
                    tx = await counter.decrementCount({
                        maxFeePerGas: gasOpts?.maxFeePerGas,
                        maxPriorityFeePerGas: gasOpts?.maxPriorityFeePerGas,
                        gasLimit: gasOpts?.gasLimit,
                    });
                    break;
                case `setCount`:
                    count = BigNumber.from(askFor(`count`));
                    tx = await counter.setCount(count, {
                        maxFeePerGas: gasOpts?.maxFeePerGas,
                        maxPriorityFeePerGas: gasOpts?.maxPriorityFeePerGas,
                        gasLimit: gasOpts?.gasLimit,
                    });
                    break;
                default:
                    count = await counter.getCount();
                    console.log(`current count: ${count}`);
            }
            if (tx != undefined) {
                await tx.wait();
                console.log(
                    `transaction: ${explorerUrl(network.config.chainId, UrlType.TX, tx.hash)}`,
                );
            }
            void main(wallet, gasOpts);
            return;
        }
    }
}

async function askForWallet(): Promise<Wallet> {
    console.log(`Your available BIP-44 derivation path (m/44'/60'/0'/0) account wallets to use:`);
    const signers = await ethers.getSigners();
    for (let i = 1; i <= signers.length; i++) {
        console.log(i, await signers[i - 1].getAddress());
    }

    const accountNumber = askForNumber(`the wallet you wish to use (1-${signers.length})`);
    const accounts = network.config.accounts as HardhatNetworkHDAccountsConfig;
    const wallet = ethers.Wallet.fromMnemonic(
        accounts.mnemonic,
        accounts.path + `/${accountNumber - 1}`,
    );

    return wallet.connect(ethers.provider);
}

const GIGA: number = 10 ** 9;

async function askForGasOptions(): Promise<GasOptions | undefined> {
    const blockFeeData = await ethers.provider.getFeeData();
    const maxFeePerGas = askForMaxFeePerGas(blockFeeData);
    const maxPriorityFeePerGas = askForMaxPriorityFeePerGas(blockFeeData);
    const gasLimit = askForGasLimit();

    return {
        maxPriorityFeePerGas: maxPriorityFeePerGas,
        maxFeePerGas: maxFeePerGas,
        gasLimit: gasLimit,
    };
}

function askForMaxFeePerGas(feeData: FeeData): BigNumber | undefined {
    const defaultMaxFee = feeData.maxFeePerGas === null ? BigNumber.from(0) : feeData.maxFeePerGas;
    const defaultMaxFeeStr = (defaultMaxFee.toNumber() / GIGA).toString();
    for (;;) {
        const gasFeeStr = askFor(`maxFeePerGas in GWei`, defaultMaxFeeStr);
        const gasFee = parseFloat(gasFeeStr);
        if (Number.isFinite(gasFee) && gasFee >= 0) {
            const feeWei = (gasFee * GIGA).toFixed();
            const feeBn = BigNumber.from(feeWei);
            return feeBn.isZero() ? undefined : feeBn;
        }
        printInvalidInput(`maxFeePerGas`);
    }
}

function askForMaxPriorityFeePerGas(feeData: FeeData): BigNumber | undefined {
    const defaultPriorityFee =
        feeData.maxPriorityFeePerGas === null ? BigNumber.from(0) : feeData.maxPriorityFeePerGas;
    const defaultPriorityFeeStr = (defaultPriorityFee.toNumber() / GIGA).toString();
    for (;;) {
        const priorityFeeStr = askFor(`maxPriorityFeePerGas in GWei`, defaultPriorityFeeStr);
        const priorityFee = parseFloat(priorityFeeStr);
        if (Number.isFinite(priorityFee) && priorityFee >= 0) {
            const feeWei = (priorityFee * GIGA).toFixed();
            const feeBn = BigNumber.from(feeWei);
            return feeBn.isZero() ? undefined : feeBn;
        }
        printInvalidInput(`maxPriorityFeePerGas`);
    }
}

function askForGasLimit(): BigNumber | undefined {
    const limitBn = BigNumber.from(askForNumber(`gasLimit in Wei (0 for estimate)`, `0`));
    return limitBn.isZero() ? undefined : limitBn;
}

enum Usage {
    DEPLOY = `deploy contracts`,
    CALL = `call contract functions`,
}

function askForUsage(): string {
    const usageOpts = [Usage.DEPLOY, Usage.CALL];
    const usageChoice = keyInSelect(usageOpts, `Please enter your intended usage`, {
        cancel: true,
    });

    return usageOpts[usageChoice];
}

function askForContract(contractName: string): string {
    const defaultAddr = deployments.deployments
        .find((d: { network: string }) => d.network === network.name)
        ?.contracts.find((c: { name: string }) => c.name == contractName)?.address;
    return askForAddress(`of the ${contractName} contract`, defaultAddr);
}

// --- Deployment helpers ---

// Contributed by Dmitriy Shepelev (@DmitriyShepelev)

const JSON_NUM_SPACES = 4;

// eslint-disable-next-line @typescript-eslint/no-var-requires, node/no-unpublished-require
let deployments: Deployments = require(`../deployments.json`);

async function trackDeployment<T extends Contract>(
    fn: () => Promise<T>,
    name: string = `Contract`,
): Promise<T> {
    for (;;) {
        try {
            console.log(`Deploying ${name} ...`);

            const contract = await fn();
            const net = await contract.provider.getNetwork();

            console.log(
                `${name} address: ${explorerUrl(net.chainId, UrlType.ADDRESS, contract.address)}`,
            );
            console.log(
                `${name} transaction: ${explorerUrl(
                    net.chainId,
                    UrlType.TX,
                    contract.deployTransaction.hash,
                )}`,
            );
            if (contract.deployTransaction.gasPrice) {
                console.log(`Gas price: ${contract.deployTransaction.gasPrice.toString()} wei`);
            }
            console.log(`Deployer address: ${contract.deployTransaction.from} \n`);

            const update = askYesNo(
                `Update 'deployments.json' with new ${name} address ${contract.address}?`,
            );
            if (update) {
                deployments = updateDeploymentsJson(
                    deployments,
                    name,
                    contract.address,
                    net.chainId,
                );
                fs.writeFileSync(
                    path.join(__dirname, `..`, `deployments.json`),
                    JSON.stringify(deployments, null, JSON_NUM_SPACES),
                );
            }

            return contract;
        } catch (e) {
            console.log(`Failed to deploy ${name} contract, error: ${e}`);
            if (askYesNo(`Retry?`) == false) {
                throw `Deployment failed`;
            }
        }
    }
}

function updateDeploymentsJson(
    deployments: Deployments,
    contractName: string,
    contractAddr: string,
    chainId: number,
): Deployments {
    const networks = deployments.deployments;
    const networkName = (Object.keys(chainIds) as (keyof typeof chainIds)[]).find(key => {
        return chainIds[key] === chainId;
    });
    if (networkName === undefined) {
        throw `Unsupported chainId ${chainId}`;
    }
    for (let i = 0; i < networks.length; i++) {
        if (networks[i].network === networkName) {
            for (let j = 0; j < networks[i].contracts.length; j++) {
                const currContractName = networks[i].contracts[j].name;
                if (currContractName === contractName) {
                    deployments.deployments[i].contracts[j].address = contractAddr;
                    return deployments;
                }
            }
            // The network already exists but an entry for the desired contract does not, so create one:
            const depl: DeploymentContract = {
                name: contractName,
                address: contractAddr,
            };
            deployments.deployments[i].contracts.push(depl);
            return deployments;
        }
    }
    // An deployment entry for the network does not exist, so create an entry for it:

    // Get the index of the new deployment.
    const index = binarySearchByNetwork(deployments, networkName);
    const newContract: DeploymentContract = {
        name: contractName,
        address: contractAddr,
    };
    const newDeployment: Deployment = {
        network: networkName,
        contracts: [newContract],
    };

    // Place the new entry in alphabetical order based on network name.
    deployments.deployments.splice(index, 0, newDeployment);
    return deployments;
}

// Performs a binary search by the network name (e.g., goerli) to ensure the new
// deployment is placed in alphabetical order.
function binarySearchByNetwork(deployments: Deployments, networkName: string): number {
    let start = 0;
    let end = deployments.deployments.length - 1;
    while (start <= end) {
        // To prevent overflow.
        const mid = Math.floor(start + (end - start) / 2);
        if (mid == 0 && deployments.deployments[mid].network.localeCompare(networkName) > 0) {
            return mid;
        }
        if (
            deployments.deployments[mid].network.localeCompare(networkName) < 0 &&
            (mid + 1 > end ||
                deployments.deployments[mid + 1].network.localeCompare(networkName) > 0)
        ) {
            return mid + 1;
        }
        if (deployments.deployments[mid].network.localeCompare(networkName) < 0) {
            start = mid + 1;
        } else {
            end = mid - 1;
        }
    }
    return 0;
}

// --- Input handling helpers ---

function askYesNo(query: string): boolean {
    return keyInYNStrict(query);
}

function askForNumber(numberUsage: string, defaultInput?: string): number {
    for (;;) {
        const numStr = askFor(numberUsage, defaultInput);
        const num = parseInt(numStr);
        if (Number.isInteger(num)) {
            return num;
        }
        printInvalidInput(`number`);
    }
}

function askForAddress(addressUsage: string, defaultInput?: string): string {
    for (;;) {
        const address = askFor(`the address ` + addressUsage, defaultInput);
        if (utils.isAddress(address)) {
            return address;
        }
        printInvalidInput(`address`);
    }
}

function askFor(query: string, defaultInput?: string, hideInput = false): string {
    const questionDefault = defaultInput == null ? `` : ` (default: ` + defaultInput + `)`;
    const options = {
        hideEchoBack: hideInput,
        limit: /./,
        limitMessage: ``,
        defaultInput,
    };
    return question(`Enter ` + query + questionDefault + `:\n`, options);
}

function printInvalidInput(inputType: string): void {
    console.log(`The ${inputType} you entered is invalid. Please try again.`);
}

main().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
