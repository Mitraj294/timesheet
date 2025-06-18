import React from 'react';
import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import store from '../src/store/store';
import App from '../src/App';

// Mock leaflet image imports for this test only
jest.mock('leaflet/dist/images/marker-icon-2x.png', () => 'marker-icon-2x.png');
jest.mock('leaflet/dist/images/marker-icon.png', () => 'marker-icon.png');
jest.mock('leaflet/dist/images/marker-shadow.png', () => 'marker-shadow.png');

test('renders login header', () => {
  render(
    <Provider store={store}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </Provider>
  );
  expect(screen.getByText(/Sign In with TimeSheet/i)).toBeInTheDocument();
});
