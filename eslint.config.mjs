import globals from "globals";
import pluginJs from "@eslint/js";

/** @type {import('eslint').Linter.Config[]} */
export default [
  {
    files: ["**/*.js"],
    languageOptions: { sourceType: "commonjs" }
  },
  { languageOptions: { globals: globals.node } },
  pluginJs.configs.recommended,
  {
    rules: {
      "no-var": "error",
      quotes: ["error", "double"],
      "no-console": ["warn", { allow: ["warn", "error"] }],
      semi: ["error", "always"],
      indent: ["error", 2],
      "brace-style": ["error", "1tbs"],
      "no-trailing-spaces": "error",
      "prefer-const": "error",
      "arrow-spacing": ["error", { before: true, after: true }],
      eqeqeq: ["error", "always"],
      "no-unused-vars": ["error", { args: "none" }],
      "no-else-return": "error",
      "no-new-func": "error",
      "no-eval": "error",
      "no-duplicate-imports": "error",
      "no-prototype-builtins": "error",
      "no-implicit-globals": "error",
      "max-len": ["warn", { code: 80 }],
      "object-curly-spacing": ["error", "always"],
      camelcase: "error"
    }
  }
];
