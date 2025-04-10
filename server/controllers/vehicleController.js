import Vehicle from '../models/Vehicle.js';

export const getVehicles = async (req, res) => {
  try {
    const vehicles = await Vehicle.find().sort({ createdAt: -1 });
    res.json(vehicles);
  } catch {
    res.status(500).json({ error: 'Failed to fetch vehicles' });
  }
};

export const getVehicleById = async (req, res) => {
  try {
    const vehicle = await Vehicle.findById(req.params.id);
    if (!vehicle) return res.status(404).json({ error: 'Not found' });
    res.json(vehicle);
  } catch {
    res.status(500).json({ error: 'Error getting vehicle' });
  }
};

export const createVehicle = async (req, res) => {
  try {
    const { name, hours, wofRego } = req.body;
    const vehicle = new Vehicle({ name, hours, wofRego });
    await vehicle.save();
    res.status(201).json(vehicle);
  } catch {
    res.status(500).json({ error: 'Error creating vehicle' });
  }
};

export const updateVehicle = async (req, res) => {
  try {
    const updated = await Vehicle.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updated);
  } catch {
    res.status(500).json({ error: 'Error updating vehicle' });
  }
};

export const deleteVehicle = async (req, res) => {
  try {
    await Vehicle.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted' });
  } catch {
    res.status(500).json({ error: 'Error deleting vehicle' });
  }
};
