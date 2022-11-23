import { expect } from "chai";
import { BaseContract, ContractReceipt, ContractTransaction, utils } from "ethers";
import { Interface } from "ethers/lib/utils";

import { TransactionReceipt } from "@ethersproject/providers";
import { GAS_MODE } from "../hardhat.config";

// --- Transaction & contract deployment helpers ---

// Wait for a contract to be deployed.
export async function deployWait<T extends BaseContract>(contractPromise: Promise<T>): Promise<T> {
    const contract = await contractPromise;
    await contract.deployed();
    return contract;
}

// Submit a transaction and wait for it to be mined. Then assert that it succeeded.
export async function submitTxWait(
    tx: Promise<ContractTransaction>,
    txName = `transaction`,
): Promise<ContractReceipt> {
    void expect(tx).to.not.be.reverted;
    const receipt = await (await tx).wait();
    if (GAS_MODE) {
        console.log(`Gas used for ` + txName + `: ` + receipt.gasUsed.toString());
    }
    expect(receipt.status).to.eq(1);
    return receipt;
}

// Submit a transaction and expect it to fail. Throws an error if it succeeds.
export async function submitTxFail(
    tx: Promise<ContractTransaction>,
    expectedCause?: string,
): Promise<void> {
    const receipt = tx.then(result => result.wait());
    await expectTxFail(receipt, expectedCause);
}

// Expect a transaction to fail. Throws an error if it succeeds.
export async function expectTxFail<T>(tx: Promise<T>, expectedCause?: string): Promise<void> {
    try {
        await tx;
    } catch (error) {
        if (expectedCause) {
            if (!(error instanceof Error)) {
                throw error;
            }

            // error cleaning
            let cause = error.message.replace(
                `VM Exception while processing transaction: reverted with reason string `,
                ``,
            );
            // custom error specific
            cause = cause.replace(
                `VM Exception while processing transaction: reverted with custom error `,
                ``,
            );
            // custom error specific, e.g. 'MsgNeedsAddr()' error to check for just 'MsgNeedsAddr'
            cause = cause.replace(`()`, ``);
            expect(cause).to.equal(
                `'` + expectedCause + `'`,
                `tx failed as expected, but unexpected reason string`,
            );
        }
        return;
    }
    expect.fail(`expected tx to fail, but it succeeded`);
}

export function parseEvent(
    receipt: TransactionReceipt,
    contractInterface: Interface,
): utils.LogDescription[] {
    const res: utils.LogDescription[] = [];
    for (const log of receipt.logs) {
        let result;
        try {
            result = contractInterface.parseLog(log);
            res.push(result);
        } catch (e) {
            continue;
        }
    }
    return res;
}
