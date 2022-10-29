/* eslint-disable */
import "@nomiclabs/hardhat-ethers";
import "@nomiclabs/hardhat-etherscan";
import "hardhat-gas-reporter";
import "solidity-coverage";
import "@nomiclabs/hardhat-waffle";
import "@nomiclabs/hardhat-solhint";
import "@typechain/hardhat";
import "hardhat-contract-sizer";
import "@primitivefi/hardhat-dodoc";
import "hardhat-tracer";

import * as dotenv from "dotenv";
import { readFileSync } from "fs";
import { TASK_COMPILE_SOLIDITY_GET_SOURCE_PATHS } from "hardhat/builtin-tasks/task-names";
import { HardhatUserConfig, subtask } from "hardhat/config";
import { NetworkUserConfig } from "hardhat/types";
import { resolve } from "path";
import * as toml from "toml";

import { BigNumber } from "@ethersproject/bignumber";

dotenv.config({ path: resolve(__dirname, `./.env`) });

export const REPORT_GAS: boolean = process.env.REPORT_GAS == `TRUE` ? true : false;
export const VERBOSE: boolean = process.env.VERBOSE == `TRUE` ? true : false;

const SOLC_DEFAULT: string = `0.8.17`;

const GAS_LIMITS = {
    coverage: BigNumber.from(3_000_000_000),
    hardhat: BigNumber.from(3_000_000_000),
};

const chainIds = {
    mainnet: 1,
    goerli: 5,
    optimism: 10,
    bsc: 56,
    arbitrum: 42161,
    "arbitrum-goerli": 421613,
    avalanche: 43114,
    "polygon-mainnet": 137,
    "polygon-mumbai": 80001,
    hardhat: 31337,
};

function getChainConfig(chain: keyof typeof chainIds): NetworkUserConfig {
    let jsonRpcUrl: string;
    switch (chain) {
        case `arbitrum`:
            jsonRpcUrl = `https://arb-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`;
            break;
        case `arbitrum-goerli`:
            jsonRpcUrl = `https://arb-goerli.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`;
            break;
        case `avalanche`:
            jsonRpcUrl = `https://api.avax.network/ext/bc/C/rpc`;
            break;
        case `bsc`:
            jsonRpcUrl = `https://bsc-dataseed1.binance.org`;
            break;
        default:
            jsonRpcUrl = `https://${chain}.infura.io/v3/${process.env.INFURA_API_KEY}`;
    }
    return {
        accounts: {
            mnemonic: process.env.MNEMONIC,
            path: `m/44'/60'/0'/0`,
        },
        chainId: chainIds[chain],
        url: jsonRpcUrl,
    };
}

// try use forge config
let foundry;
try {
    foundry = toml.parse(readFileSync(`./foundry.toml`).toString());
    foundry.default.solc = foundry.default[`solc-version`]
        ? foundry.default[`solc-version`]
        : SOLC_DEFAULT;
} catch (error) {
    foundry = {
        default: {
            solc: SOLC_DEFAULT,
        },
    };
}

// prune forge style tests from hardhat paths
subtask(TASK_COMPILE_SOLIDITY_GET_SOURCE_PATHS).setAction(async (_, __, runSuper) => {
    const paths = await runSuper();
    return paths.filter((p: string) => !p.endsWith(`.t.sol`));
});

// https://hardhat.org/config/ to learn more
const config: HardhatUserConfig = {
    paths: {
        artifacts: `./artifacts`,
        cache: `./cache`,
        sources: `./contracts`,
        tests: `./integration`,
    },
    defaultNetwork: `hardhat`,
    solidity: {
        version: foundry.default?.solc || SOLC_DEFAULT,
        settings: {
            optimizer: {
                // Disable the optimizer when debugging
                // https://hardhat.org/hardhat-network/#solidity-optimizer-support
                enabled: foundry.default?.optimizer || true,
                runs: foundry.default?.optimizer_runs || 200,
                details: {
                    yul: foundry.default?.optimizer_details?.yul || true,
                },
            },
            // If stack-too-deep error occurs, flip this on
            // otherwise leave off for faster builds
            viaIR: foundry.default?.via_ir || false,
        },
    },
    networks: {
        hardhat: {
            accounts: {
                mnemonic: process.env.MNEMONIC,
            },
            allowUnlimitedContractSize: true,
            chainId: chainIds.hardhat,
            blockGasLimit: GAS_LIMITS.hardhat.toNumber(),
            gas: GAS_LIMITS.hardhat.toNumber(), // https://github.com/nomiclabs/hardhat/issues/660#issuecomment-715897156
        },
        mainnet: getChainConfig(`mainnet`),
        goerli: getChainConfig(`goerli`),
        arbitrum: getChainConfig("arbitrum"),
        "arbitrum-goerli": getChainConfig("arbitrum-goerli"),
        avalanche: getChainConfig(`avalanche`),
        bsc: getChainConfig(`bsc`),
        optimism: getChainConfig(`optimism`),
        "polygon-mainnet": getChainConfig(`polygon-mainnet`),
        "polygon-mumbai": getChainConfig(`polygon-mumbai`),
    },
    gasReporter: {
        currency: `USD`,
        enabled: REPORT_GAS,
        coinmarketcap: process.env.CMC_API_KEY,
        excludeContracts: [`./contracts/test`],
        src: `./contracts`,
    },
    etherscan: {
        apiKey: {
            mainnet: process.env.ETHERSCAN_API_KEY || ``,
            goerli: process.env.ETHERSCAN_API_KEY || ``,
            arbitrum: process.env.ARBISCAN_API_KEY || ``,
            "arbitrum-goerli": process.env.ARBISCAN_API_KEY || ``,
            avalanche: process.env.SNOWTRACE_API_KEY || ``,
            optimism: process.env.OPTIMISM_API_KEY || ``,
            bsc: process.env.BSCSCAN_API_KEY || ``,
            "polygon-mainnet": process.env.POLYGONSCAN_API_KEY || ``,
            "polygon-mumbai": process.env.POLYGONSCAN_API_KEY || ``,
        },
    },
    typechain: {
        target: `ethers-v5`,
        outDir: `types`,
    },
    dodoc: {
        // Ensure 'docs' repo is forked and in this path
        // Check https://github.com/primitivefinance/primitive-dodoc/issues/37 for
        // why struct methods have no description transferred over
        outputDir: process.env.DOC_GEN_LOCAL_PATH,
        runOnCompile: false,
        debugMode: false,
        keepFileStructure: false,
        freshOutput: false,
        include: [`contracts/interfaces`],
    },
    contractSizer: {
        alphaSort: true,
        runOnCompile: false,
        disambiguatePaths: false,
    },
    mocha: {
        timeout: 1000000, // 1000 sec
    },
};

export default config;
