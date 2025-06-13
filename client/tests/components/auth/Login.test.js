import React from 'react';
import { render } from '@testing-library/react';
import Login from '../../../src/components/auth/Login';
import { Provider } from 'react-redux';
import store from '../../../src/store/store';
import { BrowserRouter } from 'react-router-dom';

test('renders Login component', () => {
  render(
    <Provider store={store}>
      <BrowserRouter>
        <Login />
      </BrowserRouter>
    </Provider>
  );
});
