module.exports = {
    parser: `@typescript-eslint/parser`,
    parserOptions: {
        ecmaVersion: 12,
        project: [`./tsconfig.json`],
    },
    env: {
        browser: false,
        mocha: true,
        node: true,
    },
    plugins: [`@typescript-eslint`, `prettier`],
    extends: [
        // "standard",
        `eslint:recommended`,
        `plugin:node/recommended`,
        `plugin:@typescript-eslint/recommended`,
        `plugin:@typescript-eslint/recommended-requiring-type-checking`,
        `plugin:prettier/recommended`, // prettier must be last
    ],
    root: true,
    rules: {
        "prettier/prettier": `error`,
        "arrow-body-style": `off`,
        "prefer-arrow-callback": `off`,
        quotes: [`error`, `backtick`],
        "node/no-unsupported-features/es-syntax": `off`,
        "node/no-extraneous-import": `off`,
        "node/no-missing-import": `off`,
        "node/no-unpublished-import": `off`,
        "@typescript-eslint/restrict-template-expressions": `off`,
        "@typescript-eslint/explicit-function-return-type": `error`,
        "@typescript-eslint/no-unsafe-assignment": `off`,
        "@typescript-eslint/no-unsafe-call": `off`,
        "@typescript-eslint/no-unsafe-member-access": `off`,
        "@typescript-eslint/no-unsafe-argument": `off`,
        "@typescript-eslint/no-unsafe-return": `off`,
        "@typescript-eslint/no-floating-promises": [
            `error`,
            {
                ignoreIIFE: true,
                ignoreVoid: true,
            },
        ],
        "@typescript-eslint/no-inferrable-types": `off`,
        "@typescript-eslint/no-unused-vars": [
            `warn`,
            {
                argsIgnorePattern: `_`,
                varsIgnorePattern: `_`,
            },
        ],
        "@typescript-eslint/unbound-method": `off`,
        "@typescript-eslint/no-misused-promises": [
            `error`,
            {
                checksVoidReturn: false,
            },
        ],
        "@typescript-eslint/no-non-null-assertion": `off`,
    },
};
