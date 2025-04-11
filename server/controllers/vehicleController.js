import Vehicle from '../models/Vehicle.js';

// Get all vehicles
export const getVehicles = async (req, res) => {
  try {
    const vehicles = await Vehicle.find().sort({ createdAt: -1 });
    res.json(vehicles);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch vehicles' });
  }
};

// Get single vehicle by ID
export const getVehicleById = async (req, res) => {
  try {
    const vehicle = await Vehicle.findById(req.params.id);
    if (!vehicle) return res.status(404).json({ error: 'Not found' });
    res.json(vehicle);
  } catch (err) {
    res.status(500).json({ error: 'Error getting vehicle' });
  }
};

// Create new vehicle
export const createVehicle = async (req, res) => {
  try {
    const {
      name,
      hours,
      wofRego,
      dateReviewed,
      employeeName,
      oilChecked,
      vehicleChecked,
      vehicleBroken,
      notes
    } = req.body;

    const vehicle = new Vehicle({
      name,
      hours,
      wofRego,
      dateReviewed,
      employeeName,
      oilChecked,
      vehicleChecked,
      vehicleBroken,
      notes
    });

    await vehicle.save();
    res.status(201).json(vehicle);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error creating vehicle' });
  }
};

// Update vehicle
export const updateVehicle = async (req, res) => {
  try {
    const updated = await Vehicle.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Error updating vehicle' });
  }
};

// Delete vehicle
export const deleteVehicle = async (req, res) => {
  try {
    await Vehicle.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Error deleting vehicle' });
  }
};
