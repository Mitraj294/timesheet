import React, { useState } from "react";
import { Routes, Route } from "react-router-dom";
import CreateClient from "./CreateClient";
import Clients from "./Clients";

const ClientManagement = () => {
  const [clients, setClients] = useState([]);

  // Add new client
  const addClient = (newClient) => {
    setClients((prevClients) => [
      ...prevClients,
      { ...newClient, id: prevClients.length + 1 }, // Add unique ID
    ]);
  };

  // Delete a client
  const deleteClient = (clientId) => {
    setClients(clients.filter((client) => client.id !== clientId));
  };

  return (
    <div>
      <Routes>
        <Route
          path="/clients"
          element={<Clients clients={clients} deleteClient={deleteClient} />}
        />
        <Route
          path="/clients/create"
          element={<CreateClient addClient={addClient} />} // Make sure addClient is passed here
        />
      </Routes>
    </div>
  );
};

export default ClientManagement;
