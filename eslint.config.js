import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist", "supabase/functions/**"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      "@typescript-eslint/no-unused-vars": "off",
    },
  },
  {
    files: ["src/components/ui/**", "src/contexts/**"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-empty-object-type": "off",
      "react-refresh/only-export-components": "off",
    },
  },
  {
    files: [
      "src/components/AudioCall.tsx",
      "src/components/VideoCall.tsx",
      "src/pages/Messages.tsx",
      "src/pages/SpeedDating.tsx",
      "src/pages/DatingCoach.tsx",
      "src/pages/Stories.tsx",
      "src/pages/Events.tsx",
      "src/pages/EditProfile.tsx",
      "src/hooks/**",
      "src/components/BlockReportDialog.tsx",
      "src/components/MessageReactions.tsx",
      "src/components/VerificationRequest.tsx",
      "src/components/IncomingCallOverlay.tsx",
      "src/pages/NearbyMap.tsx",
      "src/pages/ProfileSetup.tsx",
      "src/pages/admin/**",
    ],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
  {
    files: ["tailwind.config.ts"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },
);
