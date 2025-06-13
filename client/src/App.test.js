import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';

test('renders login header', () => {
  render(<App />);
  expect(screen.getByText(/Sign In with TimeSheet/i)).toBeInTheDocument();
});
