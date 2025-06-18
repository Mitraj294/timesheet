import { defineConfig } from "cypress";

export default defineConfig({
  projectId: 'ywsxoj',
  e2e: {
    baseUrl: process.env.CYPRESS_BASE_URL || "https://timesheet00.netlify.app",
    chromeWebSecurity: false, // Allow self-signed certs for local HTTPS
    async setupNodeEvents(on, config) {
      on('task', {
        async generateJwt({ payload, secret, options }) {
          const jwt = await import('jsonwebtoken');
          return jwt.default.sign(payload, secret, options);
        },
      });
      // implement node event listeners here
    },
  },
});
