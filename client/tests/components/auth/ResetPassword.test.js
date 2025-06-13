import React from 'react';
import { render } from '@testing-library/react';
import ResetPassword from '../../../src/components/auth/ResetPassword';
import { Provider } from 'react-redux';
import store from '../../../src/store/store';
import { BrowserRouter } from 'react-router-dom';

test('renders ResetPassword component', () => {
  render(
    <Provider store={store}>
      <BrowserRouter>
        <ResetPassword />
      </BrowserRouter>
    </Provider>
  );
});
