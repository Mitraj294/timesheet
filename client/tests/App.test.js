import React from 'react';
import { render, screen } from '@testing-library/react';
import App from '../src/App';
import { Provider } from 'react-redux';
import store from '../src/store/store';

// Mock leaflet image imports for this test only
jest.mock('leaflet/dist/images/marker-icon-2x.png', () => 'marker-icon-2x.png');
jest.mock('leaflet/dist/images/marker-icon.png', () => 'marker-icon.png');
jest.mock('leaflet/dist/images/marker-shadow.png', () => 'marker-shadow.png');

test('renders sign in header', () => {
  render(<App />);
  // Look for the sign in header text that is present in your login page
  const header = screen.getByText(/Sign In with TimeSheet/i);
  expect(header).toBeInTheDocument();
});

test('renders App component', () => {
  render(
    <Provider store={store}>
      <App />
    </Provider>
  );
});
