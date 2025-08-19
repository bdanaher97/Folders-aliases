// ESLint v9 flat config for Next.js + TypeScript + React (App Router)
// Drop-in file at the REPO ROOT. Replaces any .eslintrc* and .eslintignore.
// If you see "Could not find config file", this file was missing or not at root.

import js from "@eslint/js";
import * as tseslint from "typescript-eslint";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import next from "@next/eslint-plugin-next";

export default [
  // 1) Ignore patterns (migrated from legacy .eslintignore)
  {
    ignores: [
      "**/node_modules/**",
      ".next/**",
      "out/**",
      "dist/**",
      "build/**",
      ".vercel/**",
      "coverage/**",
      "public/**",
      "**/*.min.*"
    ],
  },

  // 2) Base JS recommendations
  js.configs.recommended,

  // 3) TypeScript recommendations (non type-checked for speed)
  ...tseslint.configs.recommended,

  // 4) App code rules / plugins
  {
    files: ["**/*.{ts,tsx,js,jsx}"],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        ecmaFeatures: { jsx: true }
        // For type-aware linting later:
        // project: ["./tsconfig.json"],
        // tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      "@typescript-eslint": tseslint.plugin,
      react,
      "react-hooks": reactHooks,
      "@next/next": next,
    },
    rules: {
      // React/Next sensible defaults
      "react/react-in-jsx-scope": "off",
      "react/jsx-uses-react": "off",
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",

      // Next.js plugin tweaks (tune if desired)
      "@next/next/no-img-element": "off",
      "@next/next/no-html-link-for-pages": "off"
    },
    settings: {
      react: { version: "detect" },
    },
  },
];
