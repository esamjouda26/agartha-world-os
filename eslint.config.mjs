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
  // ──────────────────────────────────────────────────────────────────
  // Topology guards — keep src/components/ui/ flat, keep sonner
  // wrapped, and keep features isolated from each other.
  //
  //   1. No subfolders under @/components/ui/* — shadcn convention is
  //      flat, the CLI writes flat, and role-based taxonomies fight the
  //      CLI plus breed bikeshedding.
  //   2. No barrel imports from @/components/ui — deep imports only, so
  //      HMR granularity stays intact and no internal index.ts can creep
  //      back in.
  //   3. sonner MUST go through @/components/ui/toast-helpers — all UI
  //      copy + durations live there. Direct `from "sonner"` is reserved
  //      for the wrapper + the `<Toaster>` primitive.
  //   4. Features are islands — no @/features/a ↔ @/features/b imports.
  //      Cross-feature sharing happens via @/lib/* or @/components/shared/*.
  // ──────────────────────────────────────────────────────────────────
  {
    files: ["src/**/*.{ts,tsx}", "middleware.ts"],
    ignores: [
      "src/components/ui/sonner.tsx",
      "src/components/ui/toast-helpers.tsx",
    ],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          // `paths` — exact-string matches. Used for the bare-barrel ban
          // because pattern globs would accidentally swallow deep imports
          // like `@/components/ui/button`.
          paths: [
            {
              name: "@/components/ui",
              message:
                "No barrel imports. Import the specific primitive: `@/components/ui/<name>`. Barrels hurt HMR + tree-shaking.",
            },
            {
              name: "@/components/ui/index",
              message:
                "No barrel imports. Import the specific primitive: `@/components/ui/<name>`.",
            },
            {
              name: "sonner",
              message:
                "Route through `@/components/ui/toast-helpers` (toastSuccess/toastError/…). Direct sonner usage is reserved for the Toaster primitive.",
            },
          ],
          // `patterns` — globs. Used for subfolder bans because they
          // must catch any deep path under the role folders.
          patterns: [
            {
              group: [
                "@/components/ui/data/*",
                "@/components/ui/feedback/*",
                "@/components/ui/forms/*",
                "@/components/ui/layout/*",
                "@/components/ui/navigation/*",
                "@/components/ui/overlays/*",
              ],
              message:
                "src/components/ui/ is flat — import `@/components/ui/<name>` directly. Subfolder taxonomies fight the shadcn CLI.",
            },
          ],
        },
      ],
    },
  },
  // Cross-feature isolation — a file in features/A may not import from
  // features/B. Promote shared code to `@/lib/*`, `@/hooks/*`, or
  // `@/components/shared/*`. One override block per feature, so adding a
  // new feature = one new block listing every sibling feature it is barred
  // from importing. CLAUDE.md §8.
  {
    files: ["src/features/attendance/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/features/auth/*"],
              message:
                "Cross-feature imports are forbidden. Share via @/lib/*, @/hooks/*, or @/components/shared/*.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["src/features/auth/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/features/attendance/*"],
              message:
                "Cross-feature imports are forbidden. Share via @/lib/*, @/hooks/*, or @/components/shared/*.",
            },
          ],
        },
      ],
    },
  },
  prettier,
);
