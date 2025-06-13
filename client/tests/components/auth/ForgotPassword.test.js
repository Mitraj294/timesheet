import React from 'react';
import { render } from '@testing-library/react';
import ForgotPassword from '../../../src/components/auth/ForgotPassword';
import { Provider } from 'react-redux';
import store from '../../../src/store/store';
import { BrowserRouter } from 'react-router-dom';

test('renders ForgotPassword component', () => {
  render(
    <Provider store={store}>
      <BrowserRouter>
        <ForgotPassword />
      </BrowserRouter>
    </Provider>
  );
});
