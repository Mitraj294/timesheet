import VehicleHistory from '../models/VehicleHistory.js';

export const getVehicleHistoryByVehicle = async (req, res) => {
  try {
    const { vehicleId } = req.params;
    const history = await VehicleHistory.find({ vehicle: vehicleId }).sort({ date: -1 });
    res.json(history);
  } catch (error) {
    console.error('Error fetching vehicle history:', error);
    res.status(500).json({ error: 'Failed to fetch vehicle history' });
  }
};
