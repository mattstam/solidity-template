import { BigNumber } from "ethers";

// GasOptions specifies an EIP-1559 gas configuration for transactions. In this scheme, a
// per-block `baseFeePerGas` is determined, and increases or decreases based on network
// congestion. A priority fee (tip) is given to the block builder, which is determined with:
//
//    priorityFeePerGas = min(T.maxPriorityFeePerGas, T.maxFeePerGas - B.baseFeePerGas)
//
// For more details, see:
//      https://eips.ethereum.org/EIPS/eip-1559
//      https://www.blocknative.com/blog/eip-1559-fees
//
// Any undefined gas options will be estimated at transaction creation time.
export type GasOptions = {
    // maxFeePerGas is an upper bound to the `priorityFeePerGas` option plus the block's
    // `baseFeePerGas`. If the block's `baseFeePerGas` is lower than `maxFeePerGas`, the
    // difference gets refunded to sender. This fee is burnt completely.
    maxFeePerGas: BigNumber | undefined;
    // maxPriorityFeePerGas is an upper bound to just the `priorityFeePerGas`. This value is
    // often used by block builders to evalute which transactions to include. This fee is given to
    // the block builder as a tip.
    maxPriorityFeePerGas: BigNumber | undefined;
    // gasLimit is an upper bound of gas a transaction is allowed to consume. If gasLimit >
    // gasConsumed, then the transaction will execute normally. Any unused gas is refunded at
    // the end of the transaction. If gasLimit < gasConsumed, then the transaction reverts
    // (out-of-gas error) and consumed gas is not refunded.
    gasLimit: BigNumber | undefined;
};

// Deployments are stored in a JSON file in the root of the project. This file may be
// updated after each deployment with the new contract addresses. It is segmented by
// network.

export type DeploymentContract = {
    name: string;
    address: string;
};

export type Deployment = {
    network: string;
    contracts: Array<DeploymentContract>;
};

export type Deployments = {
    deployments: Array<Deployment>;
};
