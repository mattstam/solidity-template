import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { BigNumber, Contract, ContractTransaction, utils } from "ethers";
import * as fs from "fs";
import { ethers, network } from "hardhat";
import * as path from "path";
import { keyInSelect, keyInYNStrict, question } from "readline-sync";
import { Counter } from "../types";
import { deployCounter } from "./deploy";

enum Usage {
    DEPLOY = `deploy contracts`,
    CALL = `call contract functions`,
}

async function main(signer?: SignerWithAddress): Promise<void> {
    if (signer == undefined) {
        signer = await askForSigner();
    }

    switch (askForUsage()) {
        case Usage.DEPLOY: {
            await trackDeployment(() => deployCounter(signer, 0), `Counter`);
            void main(signer);
            break;
        }
        case Usage.CALL: {
            const addr = askForContract(`Counter`);
            const counter: Counter = await ethers.getContractAt(`Counter`, addr);

            let tx: ContractTransaction | undefined = undefined;
            let count: BigNumber;
            switch (askFor(`function call`)) {
                case `incrementCount`:
                    tx = await counter.incrementCount();
                    break;
                case `decrementCount`:
                    tx = await counter.decrementCount();
                    break;
                case `setCount`:
                    count = BigNumber.from(askFor(`count`));
                    tx = await counter.setCount(count);
                    break;
                default:
                    count = await counter.getCount();
                    console.log(`current count: ${count}`);
            }
            if (tx != undefined) {
                await tx.wait();
                console.log(`transaction: ${etherscanTx(network.name, tx.hash)}`);
            }
            void main(signer);
            return;
        }
    }
}

async function askForSigner(): Promise<SignerWithAddress> {
    const signers = await ethers.getSigners();

    // Listing all 20 is a bit much, so we'll just list the first 5 instead of 'signers.length'.
    // For example of configuring this as a env var, see Git Consensus:
    // https://github.com/git-consensus/contracts/blob/de9e68e48b016b29c535d38eb99e464764228ff4/.env.example#L3
    console.log(`Your available BIP-44 derivation path (m/44'/60'/0'/0) account signers to use:`);
    for (let i = 1; i <= 5; i++) {
        console.log(i, await signers[i - 1].getAddress());
    }
    const accountNumber = askForNumber(`the signer you wish to use (1-5)`);
    const deployer = signers[accountNumber - 1];
    return deployer;
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

type DeploymentContract = {
    name: string;
    address: string;
};

type Deployment = {
    network: string;
    contracts: Array<DeploymentContract>;
};

type Deployments = {
    deployments: Array<Deployment>;
};

async function trackDeployment<T extends Contract>(
    fn: () => Promise<T>,
    name: string = `Contract`,
): Promise<T> {
    for (; ;) {
        try {
            console.log(`Deploying ${name} ...`);

            const contract = await fn();
            const net = await contract.provider.getNetwork();

            console.log(`${name} address: ${etherscanAddress(net.name, contract.address)}`);
            console.log(
                name,
                `transaction:`,
                etherscanTx(net.name, contract.deployTransaction.hash),
            );
            if (contract.deployTransaction.gasPrice) {
                console.log(`Gas price: ${contract.deployTransaction.gasPrice.toString()} wei`);
            }
            console.log(`Deployer address: ${contract.deployTransaction.from} \n`);

            const update = askYesNo(
                `Update 'deployments.json' with new ${name} address ${contract.address}?`,
            );
            if (update) {
                deployments = updateDeploymentsJson(deployments, name, contract.address, net.name);
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
    networkName: string,
): Deployments {
    const networks = deployments.deployments;
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

function etherscanAddress(net: string, addr: string): string {
    if (net == `mainnet`) {
        return `https://etherscan.io/address/` + addr;
    }
    if (net == `arbitrum`) {
        return `https://arbiscan.io/address/` + addr;
    }
    if (net == `arbitrum-rinkeby`) {
        return `https://testnet.arbiscan.io/address/` + addr;
    }
    if (net == `avalanche`) {
        return `https://snowtrace.io/address/` + addr;
    }
    if (net == `avalanche-fuji`) {
        return `https://testnet.snowtrace.io/address/` + addr;
    }
    return `https://` + net + `.etherscan.io/address/` + addr;
}

function etherscanTx(net: string, txHash: string): string {
    if (net == `mainnet`) {
        return `https://etherscan.io/tx/` + txHash;
    }
    if (net == `arbitrum`) {
        return `https://arbiscan.io/tx/` + txHash;
    }
    if (net == `arbitrum-rinkeby`) {
        return `https://testnet.arbiscan.io/tx/` + txHash;
    }
    if (net == `avalanche`) {
        return `https://snowtrace.io/address/` + addr;
    }
    if (net == `avalanche-fuji`) {
        return `https://testnet.snowtrace.io/address/` + addr;
    }
    return `https://` + net + `.etherscan.io/tx/` + txHash;
}

// --- Input handling helpers ---

function askYesNo(query: string): boolean {
    return keyInYNStrict(query);
}

function askForNumber(numberUsage: string, defaultInput?: string): number {
    for (; ;) {
        const numStr = askFor(numberUsage, defaultInput);
        const num = parseInt(numStr);
        if (Number.isInteger(num)) {
            return num;
        }
        printInvalidInput(`number`);
    }
}

function askForAddress(addressUsage: string, defaultInput?: string): string {
    for (; ;) {
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
