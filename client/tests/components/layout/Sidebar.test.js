import React from 'react';
import { render } from '@testing-library/react';
import Sidebar from '../../../src/components/layout/Sidebar';
import { Provider } from 'react-redux';
import store from '../../../src/store/store';
import { BrowserRouter } from 'react-router-dom';
import { SidebarProvider } from '../../../src/context/SidebarContext';

test('renders Sidebar component', () => {
  render(
    <Provider store={store}>
      <BrowserRouter>
        <SidebarProvider>
          <Sidebar />
        </SidebarProvider>
      </BrowserRouter>
    </Provider>
  );
});
