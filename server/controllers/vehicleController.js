import Vehicle from '../models/Vehicle.js';
import VehicleReview from '../models/VehicleReview.js';
import Employee from '../models/Employee.js';

// --- Vehicle Routes ---

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
    const { name, hours, wofRego } = req.body;

    const vehicle = new Vehicle({
      name,
      hours,
      wofRego,
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

// --- Vehicle Review Routes ---

// Create a Vehicle Review
export const createVehicleReview = async (req, res) => {
  try {
    const { vehicle, dateReviewed, employeeId, oilChecked, vehicleChecked, vehicleBroken, notes, hours } = req.body;

    const existingVehicle = await Vehicle.findById(vehicle);
    if (!existingVehicle) {
      return res.status(404).json({ error: 'Vehicle not found' });
    }

    const existingEmployee = await Employee.findById(employeeId);
    if (!existingEmployee) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    const review = new VehicleReview({
      vehicle,
      dateReviewed,
      employeeId,
      oilChecked,
      vehicleChecked,
      vehicleBroken,
      notes,
      hours,
    });

    await review.save();
    res.status(201).json(review);
  } catch (err) {
    console.error('Error creating review:', err);
    res.status(500).json({ error: 'Failed to create review' });
  }
};

// Get reviews by vehicle ID
export const getVehicleReviewsByVehicleId = async (req, res) => {
  try {
    const { vehicleId } = req.params;
    const vehicle = await Vehicle.findById(vehicleId);
    if (!vehicle) {
      return res.status(404).json({ message: 'Vehicle not found' });
    }

    const reviews = await VehicleReview.find({ vehicle: vehicleId })
      .populate('vehicle', 'wofRego')
      .populate('employeeId', 'name');

    res.status(200).json({ vehicle, reviews });
  } catch (err) {
    console.error('Error fetching vehicle reviews:', err);
    res.status(500).json({ message: 'Server error' });
  }
};
// Get a single vehicle review by reviewId
export const getReviewById = async (req, res) => {
  try {
    const review = await VehicleReview.findById(req.params.reviewId).populate('employeeId vehicle');
    if (!review) return res.status(404).json({ error: 'Review not found' });
    res.json(review);
  } catch (err) {
    console.error('Error fetching review by ID:', err);
    res.status(500).json({ error: 'Failed to fetch review' });
  }
};

// Get vehicle with reviews by vehicle ID
export const getVehicleWithReviews = async (req, res) => {
  try {
    const vehicle = await Vehicle.findById(req.params.vehicleId);
    if (!vehicle) {
      return res.status(404).json({ message: 'Vehicle not found' });
    }

    const reviews = await VehicleReview.find({ vehicle: req.params.vehicleId });
    res.json({ vehicle, reviews });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Delete a review by VehicleReview ID
export const deleteReview = async (req, res) => {
  try {
    const { reviewId } = req.params;

    // Check if the review exists
    const deletedReview = await VehicleReview.findByIdAndDelete(reviewId);
    if (!deletedReview) {
      return res.status(404).json({ error: 'Review not found' });
    }

    res.status(200).json({ message: 'Review deleted successfully' });
  } catch (err) {
    console.error('Error deleting review:', err);
    res.status(500).json({ error: 'Failed to delete review' });
  }
};
