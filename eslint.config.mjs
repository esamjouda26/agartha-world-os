import nextPlugin from "@next/eslint-plugin-next";
import prettier from "eslint-config-prettier";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      ".next/",
      "node_modules/",
      "coverage/",
      "playwright-report/",
      "test-results/",
      "src/types/database.ts",
      "supabase/functions/",
      "supabase/migrations/",
      "public/mockServiceWorker.js",
      "next-env.d.ts",
    ],
  },
  ...tseslint.configs.recommended,
  {
    plugins: {
      "@next/next": nextPlugin,
    },
    rules: {
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs["core-web-vitals"].rules,
      "no-console": ["error", { allow: ["warn", "error", "info"] }],
      "no-var": "error",
      "prefer-const": "error",
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/consistent-type-imports": "warn",
    },
  },
  // ──────────────────────────────────────────────────────────────────
  // RBAC / nav import boundaries — ADR-0004.
  //
  // The Edge middleware bundle must not pull icon names, i18n keys, or
  // any UI metadata. Enforce the firewall at the import level so
  // violations fail `pnpm lint` rather than waiting for a runtime
  // bundle-size alarm.
  // ──────────────────────────────────────────────────────────────────
  {
    files: ["src/lib/rbac/**/*.{ts,tsx}", "src/features/*/rbac.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "lucide-react",
                "next-intl",
                "react",
                "react-dom",
                "@/lib/nav/*",
                "@/features/*/nav",
              ],
              message:
                "RBAC/security modules must not import UI, i18n, React, or nav metadata. ADR-0004 — keeps Edge bundle lean.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["middleware.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/lib/nav/*", "@/features/*/nav"],
              message:
                "middleware.ts runs on Edge Runtime; nav metadata must never reach it. Use @/lib/rbac/policy instead. ADR-0004.",
            },
          ],
        },
      ],
    },
  },
  // Ban regex literals inside feature `rbac.ts` — URLPattern only.
  {
    files: ["src/features/*/rbac.ts"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: "NewExpression[callee.name='RegExp']",
          message:
            "Use URLPattern syntax in rbac.ts — not RegExp. ADR-0004 (no ReDoS at the Edge).",
        },
        {
          selector: "Literal[regex]",
          message:
            "Regex literals are forbidden in rbac.ts — use URLPattern syntax. ADR-0004.",
        },
      ],
    },
  },
  // Ban `as LocaleStrippedPath` anywhere except middleware.ts.
  // The brand must be minted exactly once, in `stripLocale`.
  {
    files: ["**/*.{ts,tsx}"],
    ignores: ["middleware.ts", "src/lib/rbac/types.ts"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector:
            "TSAsExpression > TSTypeReference[typeName.name='LocaleStrippedPath']",
          message:
            "Cast to LocaleStrippedPath is reserved for middleware.ts#stripLocale. Use brandLocaleStripped() in middleware only. ADR-0004.",
        },
      ],
    },
  },
  prettier,
);
