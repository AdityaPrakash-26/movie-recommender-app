module.exports = {
    root: true,
    parser: "@typescript-eslint/parser",
    parserOptions: {
        ecmaVersion: 2020,
        sourceType: "module",
        project: "./tsconfig.json",
    },
    env: {
        browser: true,
        es6: true,
        node: true,
    },
    extends: [
        "airbnb",
        "airbnb-typescript",
        "airbnb/hooks",
        "plugin:@typescript-eslint/recommended",
        "plugin:react/recommended",
        "plugin:react-hooks/recommended",
        "plugin:jsx-a11y/recommended",
        "plugin:import/typescript",
    ],
    plugins: [
        "@typescript-eslint",
        "react",
        "react-hooks",
        "jsx-a11y",
        "import",
    ],
    rules: {
        "import/extensions": "off",
        "import/no-extraneous-dependencies": "off",
        "react/react-in-jsx-scope": "off",
        "react/jsx-filename-extension": [
            1,
            { "extensions": [".tsx"] }
        ],
        "@typescript-eslint/no-unused-vars": ["warn", { "argsIgnorePattern": "^_" }],
        "react/prop-types": "off",
        "no-console": "warn",
        "import/prefer-default-export": "off",
    },
    settings: {
        react: {
            version: "detect",
        },
    },
};
