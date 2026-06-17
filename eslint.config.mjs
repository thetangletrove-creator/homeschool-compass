import js from "@eslint/js";
import tseslint from "typescript-eslint";
import nextPlugin from "@next/eslint-plugin-next";
import reactPlugin from "eslint-plugin-react";
import reactHooksPlugin from "eslint-plugin-react-hooks";
import globals from "globals";

const eslintConfig = [
  // Ignore build output and generated files
  {
    ignores: [
      ".next/",
      "node_modules/",
      "dist/",
      "out/",
      "**/*.d.ts",
    ],
  },

  // Global variables (Node.js + browser)
  { languageOptions: { globals: { ...globals.node, ...globals.browser } } },

  js.configs.recommended,
  ...tseslint.configs.recommended,

  // React plugin config
  {
    ...reactPlugin.configs.flat?.recommended,
    settings: {
      react: { version: "19.0" },
    },
  },
  reactPlugin.configs.flat?.["jsx-runtime"],

  // React Hooks plugin
  {
    plugins: { "react-hooks": reactHooksPlugin },
    rules: reactHooksPlugin.configs.recommended.rules,
  },

  // Next.js plugin
  {
    plugins: { "@next/next": nextPlugin },
    rules: {
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs["core-web-vitals"].rules,
    },
  },

  // Project-specific overrides
  {
    rules: {
      // Allow <img> — images are unoptimized, next/image adds no value
      "@next/next/no-img-element": "off",

      // Allow `any` in app code — pragmatic for rapid iteration
      "@typescript-eslint/no-explicit-any": "warn",

      // Unused vars are fine during development
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],

      // Allow require() in scripts and config files
      "@typescript-eslint/no-require-imports": "off",

      // Allow @ts-ignore (we know what we're doing)
      "@typescript-eslint/ban-ts-comment": "off",
    },
  },
];

export default eslintConfig;
