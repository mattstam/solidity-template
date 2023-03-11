import "@matterlabs/hardhat-zksync-deploy";
import "@matterlabs/hardhat-zksync-solc";
import "@nomiclabs/hardhat-ethers";
import "@nomiclabs/hardhat-etherscan";
import "@nomiclabs/hardhat-solhint";
import "@nomiclabs/hardhat-waffle";
import "@primitivefi/hardhat-dodoc";
import "@typechain/hardhat";
import "hardhat-contract-sizer";
import "hardhat-gas-reporter";
import "hardhat-tracer";
import "solidity-coverage";

import * as dotenv from "dotenv";
import { readFileSync } from "fs";
import { TASK_COMPILE_SOLIDITY_GET_SOURCE_PATHS } from "hardhat/builtin-tasks/task-names";
import { HardhatUserConfig, subtask } from "hardhat/config";
import { NetworkUserConfig } from "hardhat/types";
import { resolve } from "path";
import * as toml from "toml";

dotenv.config({ path: resolve(__dirname, `./.env`) });

// Enable increased console log verbosity
export const VERBOSE: boolean = process.env.VERBOSE == `TRUE` ? true : false;

// Enable EIP-1559 gas configuration for transactions and gas reporting
export const GAS_MODE: boolean = process.env.GAS_MODE == `TRUE` ? true : false;

// Enable deployment to zkSync networks
export const ZK_EVM: boolean = process.env.ZK_EVM == `TRUE` ? true : false;

// List of supported networks
export const chainIds = {
    arbitrum: 42161,
    "arbitrum-goerli": 421613,
    avalanche: 43114,
    "avalanche-fuji": 43113,
    bsc: 56,
    goerli: 5,
    hardhat: 31337,
    mainnet: 1,
    optimism: 10,
    "optimism-goerli": 420,
    "polygon-mainnet": 137,
    "polygon-mumbai": 80001,
    "zksync-goerli": 280,
    "zksync-mainnet": 324,
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
        case `avalanche-fuji`:
            jsonRpcUrl = `https://api.avax-test.network/ext/bc/C/rpc`;
            break;
        case `bsc`:
            jsonRpcUrl = `https://bsc-dataseed1.binance.org`;
            break;
        case `optimism`:
            jsonRpcUrl = `https://mainnet.optimism.io`;
            break;
        case `optimism-goerli`:
            jsonRpcUrl = `https://opt-goerli.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`;
            break;
        case `polygon-mainnet`:
            jsonRpcUrl = `https://polygon-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`;
            break;
        case `polygon-mumbai`:
            jsonRpcUrl = `https://polygon-mumbai.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`;
            break;
        case `zksync-goerli`:
            jsonRpcUrl = `https://zksync2-testnet.zksync.dev`;
            break;
        case `zksync-mainnet`:
            jsonRpcUrl = `https://zksync2-mainnet.zksync.io`;
            break;
        default:
            jsonRpcUrl = `https://eth-${chain}.alchemyapi.io/v2/${process.env.ALCHEMY_API_KEY}`;
    }
    return {
        accounts: {
            mnemonic: process.env.MNEMONIC,
            path: `m/44'/60'/0'/0`,
        },
        chainId: chainIds[chain],
        url: jsonRpcUrl,
        zksync: ZK_EVM,
    };
}

export enum UrlType {
    ADDRESS = `address`,
    TX = `tx`,
}

export function explorerUrl(chainId: number | undefined, type: UrlType, param: string): string {
    switch (chainId) {
        case chainIds.arbitrum:
            return `https://arbiscan.io/${type}/${param}`;
        case chainIds[`arbitrum-goerli`]:
            return `https://goerli.arbiscan.io/${type}/${param}`;
        case chainIds.avalanche:
            return `https://snowtrace.io/${type}/${param}`;
        case chainIds[`avalanche-fuji`]:
            return `https://testnet.snowtrace.io/${type}/${param}`;
        case chainIds.bsc:
            return `https://bscscan.com/${type}/${param}`;
        case chainIds.goerli:
            return `https://goerli.etherscan.io/${type}/${param}`;
        case chainIds.mainnet:
            return `https://etherscan.io/${type}/${param}`;
        case chainIds.optimism:
            return `https://optimistic.etherscan.io/${type}/${param}`;
        case chainIds[`optimism-goerli`]:
            return `https://goerli-optimism.etherscan.io/${type}/${param}`;
        case chainIds[`polygon-mainnet`]:
            return `https://polygonscan.com/${type}/${param}`;
        case chainIds[`polygon-mumbai`]:
            return `https://mumbai.polygonscan.com/${type}/${param}`;
        case chainIds[`zksync-goerli`]:
            return `https://goerli.explorer.zksync.io/${type}/${param}`;
        case chainIds[`zksync-mainnet`]:
            return `https://explorer.zksync.io/${type}/${param}`;
        default:
            return `https://etherscan.io/${type}/${param}`;
    }
}

const SOLC_DEFAULT: string = `0.8.17`;

// Try to use the Foundry config as a source of truth
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

// Prune Forge style tests from hardhat paths
subtask(TASK_COMPILE_SOLIDITY_GET_SOURCE_PATHS).setAction(async (_, __, runSuper) => {
    const paths = await runSuper();
    return paths.filter((p: string) => !p.endsWith(`.t.sol`));
});

// For full option list see: https://hardhat.org/config/
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
            zksync: ZK_EVM,
        },
        arbitrum: getChainConfig(`arbitrum`),
        "arbitrum-goerli": getChainConfig(`arbitrum-goerli`),
        avalanche: getChainConfig(`avalanche`),
        "avalanche-fuji": getChainConfig(`avalanche-fuji`),
        bsc: getChainConfig(`bsc`),
        goerli: getChainConfig(`goerli`),
        mainnet: getChainConfig(`mainnet`),
        optimism: getChainConfig(`optimism`),
        "optimism-goerli": getChainConfig(`optimism-goerli`),
        "polygon-mainnet": getChainConfig(`polygon-mainnet`),
        "polygon-mumbai": getChainConfig(`polygon-mumbai`),
        "zksync-goerli": getChainConfig(`zksync-goerli`),
        "zksync-mainnet": getChainConfig(`zksync-mainnet`),
    },
    gasReporter: {
        currency: `USD`,
        enabled: GAS_MODE,
        coinmarketcap: process.env.CMC_API_KEY,
        excludeContracts: [`./contracts/test`],
        src: `./contracts`,
    },
    etherscan: {
        apiKey: {
            arbitrum: process.env.ARBISCAN_API_KEY || ``,
            "arbitrum-goerli": process.env.ARBISCAN_API_KEY || ``,
            avalanche: process.env.SNOWTRACE_API_KEY || ``,
            "avalanche-fuji": process.env.SNOWTRACE_API_KEY || ``,
            bsc: process.env.BSCSCAN_API_KEY || ``,
            goerli: process.env.ETHERSCAN_API_KEY || ``,
            mainnet: process.env.ETHERSCAN_API_KEY || ``,
            optimism: process.env.OPTIMISM_API_KEY || ``,
            "optimism-goerli": process.env.OPTIMISM_API_KEY || ``,
            "polygon-mainnet": process.env.POLYGONSCAN_API_KEY || ``,
            "polygon-mumbai": process.env.POLYGONSCAN_API_KEY || ``,
            "zksync-goerli": process.env.ZKSYNC_API_KEY || ``,
            "zksync-mainnet": process.env.ZKSYNC_API_KEY || ``,
        },
    },
    typechain: {
        target: `ethers-v5`,
        outDir: `types`,
    },
    dodoc: {
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
    zksolc: {
        version: `1.2.1`,
        compilerSource: `binary`,
        settings: {
            experimental: {
                dockerImage: `matterlabs/zksolc`,
                tag: `v1.2.1`,
            },
        },
    },
};

export default config;
