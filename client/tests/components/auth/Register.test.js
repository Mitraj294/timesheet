import React from 'react';
import { render } from '@testing-library/react';
import Register from '../../../src/components/auth/Register';
import { Provider } from 'react-redux';
import store from '../../../src/store/store';
import { BrowserRouter } from 'react-router-dom';

test('renders Register component', () => {
  render(
    <Provider store={store}>
      <BrowserRouter>
        <Register />
      </BrowserRouter>
    </Provider>
  );
});
