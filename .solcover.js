// Configure: https://github.com/sc-forks/solidity-coverage#config-options
module.exports = {
    istanbulReporter: ["html", "lcov"],
    providerOptions: {
        mnemonic: process.env.MNEMONIC,
    },
    // skip unit test related files
    skipFiles: ["./test"],
    // avoids stack-too-deep, mess around with these if you see that
    configureYulOptimizer: true,
    solcOptimizerDetails: {
        yul: true,
        yulDetails: {
            stackAllocation: true,
        },
    },
    mocha: {
        // lets you skip coverage on certain tests, e.g.:
        //      describe('gas benchmark tests [ @skip-on-coverage ]', () => {
        //           ...
        //      }),
        grep: "@skip-on-coverage",
        invert: true,
    },
};
