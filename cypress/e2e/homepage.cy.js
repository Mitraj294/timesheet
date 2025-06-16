// Example E2E test for homepage

describe('Homepage', () => {
  it('successfully loads', () => {
    cy.visit('/');
    cy.contains('login', { matchCase: false }); // Adjust text as needed
  });
});
