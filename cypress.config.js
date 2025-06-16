import { defineConfig } from "cypress";

export default defineConfig({
  projectId: 'ywsxoj',
  e2e: {
    baseUrl: "https://localhost:3000",
    chromeWebSecurity: false, // Allow self-signed certs for local HTTPS
    setupNodeEvents(on, config) {
      // implement node event listeners here
    },
  },
});
