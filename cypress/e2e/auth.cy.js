// Authentication E2E tests

describe('Authentication E2E', () => {
  before(() => {
    cy.visit('/register');
    cy.get('select[name="role"]').select('employer');
    cy.wait(500);
    cy.get('input[name="email"]').then(($input) => {
      if ($input.val() !== 'employer@example.com') {
        cy.get('input[name="name"]').clear().type('Test Employer');
        cy.get('input[name="email"]').clear().type('employer@example.com');
        cy.get('input[name="password"]').clear().type('password123');
        cy.get('input[name="confirmPassword"]').clear().type('password123');
        cy.get('input[name="companyName"]').clear().type('Test Company');
        cy.get('input[name="country"]').clear().type('Testland');
        cy.get('input[name="phoneNumber"]').clear().type('1234567890');
        cy.get('button[type="submit"]').click();
        cy.wait(1000);
        cy.get('body').then(($body) => {
          // eslint-disable-next-line no-console
          console.log('PAGE BODY:', $body.text());
        });
        cy.get('.alert, .form-error-message, .styles_Alert, .error-message').then(($err) => {
          // eslint-disable-next-line no-console
          console.log('Error message:', $err.text());
        });
      }
    });
  });

  it('shows login form and handles invalid login', () => {
    cy.visit('/login');
    cy.get('input[name="email"]').should('be.visible').type('wronguser@example.com', { delay: 100 });
    cy.get('input[name="password"]').should('be.visible').type('wrongpassword', { delay: 100 });
    cy.get('button[type="submit"]').click();
    cy.contains('Invalid credentials'); // Match actual error message
  });

  it('logs in successfully with valid credentials', () => {
    cy.visit('/login');
    cy.get('input[name="email"]').type('employer@example.com', { delay: 100 });
    cy.get('input[name="password"]').should('exist').type('password123', { delay: 100 });
    cy.get('button[type="submit"]').click();
    cy.url().should('not.include', '/login');
    cy.contains(/dashboard|logout|welcome/i);
  });


})