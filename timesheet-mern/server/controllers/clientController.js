import Client from "../models/Client.js";

// @desc    Create a new client
// @route   POST /api/clients
// @access  Public
export const createClient = async (req, res) => {
  try {
    const { name, emailAddress, phoneNumber, address, notes, isImportant } = req.body;

    if (!name || !emailAddress || !phoneNumber) {
      return res.status(400).json({ message: "Name, Email, and Phone are required." });
    }

    const newClient = new Client({
      name,
      emailAddress,
      phoneNumber,
      address,
      notes,
      isImportant,
    });

    const savedClient = await newClient.save();
    res.status(201).json(savedClient);
  } catch (error) {
    console.error("Error creating client:", error);
    res.status(500).json({ message: "Error creating client" });
  }
};

// @desc    Fetch all clients
// @route   GET /api/clients
// @access  Public
export const getClients = async (req, res) => {
  try {
    const clients = await Client.find();
    res.status(200).json(clients);
  } catch (error) {
    console.error("Error fetching clients:", error);
    res.status(500).json({ message: "Error fetching clients" });
  }
};

// @desc    Fetch a single client by ID
// @route   GET /api/clients/:id
// @access  Public
export const getClientById = async (req, res) => {
  try {
    const client = await Client.findById(req.params.id);
    if (!client) {
      return res.status(404).json({ message: "Client not found" });
    }
    res.status(200).json(client);
  } catch (error) {
    console.error("Error fetching client by ID:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Update a client by ID
// @route   PUT /api/clients/:id
// @access  Public
export const updateClient = async (req, res) => {
  try {
    const { name, emailAddress, phoneNumber, address, notes, isImportant } = req.body;

    const updatedClient = await Client.findByIdAndUpdate(
      req.params.id,
      { name, emailAddress, phoneNumber, address, notes, isImportant },
      { new: true, runValidators: true }
    );

    if (!updatedClient) {
      return res.status(404).json({ message: "Client not found" });
    }

    res.status(200).json(updatedClient);
  } catch (error) {
    console.error("Error updating client:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Delete a client by ID
// @route   DELETE /api/clients/:id
// @access  Public
export const deleteClient = async (req, res) => {
  try {
    const client = await Client.findByIdAndDelete(req.params.id);
    if (!client) {
      return res.status(404).json({ message: "Client not found" });
    }
    res.json({ message: "Client deleted successfully" });
  } catch (error) {
    console.error("Error deleting client:", error);
    res.status(500).json({ message: "Error deleting client" });
  }
};
import Project from "../models/Project.js";


export const getClientProjects = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate the client ID
    const client = await Client.findById(id);
    if (!client) {
      return res.status(404).json({ message: "Client not found" });
    }

    // Fetch projects associated with the client
    const projects = await Project.find({ clientId: id });

    res.status(200).json(projects);
  } catch (error) {
    console.error("Error fetching projects:", error);
    res.status(500).json({ message: "Server error" });
  }
};
