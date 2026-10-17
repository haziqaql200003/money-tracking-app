// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ["dist/*"],
  },
  {
    // Alert.alert does nothing on the web; use the one in services/dialog (system alert on phones, in-app dialog on the web).
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["src/services/dialog.ts"],
    rules: {
      "no-restricted-imports": ["error", { paths: [{ name: "react-native", importNames: ["Alert"], message: "Import { Alert } from '@/services/dialog' so it also works on the web." }] }],
    },
  }
]);
