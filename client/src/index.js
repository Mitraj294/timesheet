import './sentry';
import React from "react";
import ReactDOM from "react-dom/client";
import { Provider } from "react-redux";
import store from "./store/store";
import App from "./App";
import { SidebarProvider } from "./context/SidebarContext";
import 'leaflet/dist/leaflet.css';
import "./index.css";
import * as Sentry from '@sentry/react';

const container = document.getElementById("root");
if (container) {
  const root = ReactDOM.createRoot(container);
  root.render(
    <Provider store={store}>
      <SidebarProvider>
        <Sentry.ErrorBoundary fallback={<p>An error has occurred</p>}>
          <App />
        </Sentry.ErrorBoundary>
      </SidebarProvider>
    </Provider>
  );
} else {
  console.error("Root element not found");
}
