// ***********************************************
// This example commands.js shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************
//
//
// -- This is a parent command --
// Cypress.Commands.add('login', (email, password) => { ... })
//
//
// -- This is a child command --
// Cypress.Commands.add('drag', { prevSubject: 'element'}, (subject, options) => { ... })
//
//
// -- This is a dual command --
// Cypress.Commands.add('dismiss', { prevSubject: 'optional'}, (subject, options) => { ... })
//
//
// -- This will overwrite an existing command --
// Cypress.Commands.overwrite('visit', (originalFn, url, options) => { ... })
//
//
// Custom Cypress command to reset the test database before E2E tests
Cypress.Commands.add('resetTestDB', () => {
  cy.log('Resetting test database...');
  cy.exec('NODE_ENV=test node server/scripts/clearTestDB.js', { failOnNonZeroExit: true });
});

// Custom Cypress command for programmatic login
Cypress.Commands.add('login', (email, password) => {
  cy.request('POST', '/api/auth/login', { email, password })
    .then((resp) => {
      window.localStorage.setItem('token', resp.body.token);
      // Optionally, set user info or cookies if your app requires
    });
});