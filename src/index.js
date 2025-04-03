import React from "react";
import ReactDOM from "react-dom/client";
import { Provider } from "react-redux";
import store from "./store/store";
import App from "./App";
import { SidebarProvider } from "./context/SidebarContext";
//import "@fortawesome/fontawesome-free/css/all.min.css";

import "./index.css";

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <Provider store={store}>
    <SidebarProvider>
      <App />
    </SidebarProvider>
  </Provider>
);
