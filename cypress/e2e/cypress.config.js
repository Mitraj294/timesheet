const { defineConfig } = require("cypress");

module.exports = defineConfig({
  e2e: {
    baseUrl: "https://192.168.1.47:3000", 
    setupNodeEvents(on, config) {
      // implement node event listeners here
    },
    chromeWebSecurity: false, // Allow self-signed certs for local HTTPS
  },
});
