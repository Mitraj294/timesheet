import PDFDocument from 'pdfkit';
import ExcelJS from 'exceljs';
import nodemailer from 'nodemailer';
import Vehicle from '../models/Vehicle.js';
import VehicleReview from '../models/VehicleReview.js';
import Employee from '../models/Employee.js'; // Assuming Employee model is used for reviews
import mongoose from 'mongoose';


// @desc    Get all vehicles for the logged-in employer
// @route   GET /api/vehicles
// @access  Private (Employer Only)
export const getVehicles = async (req, res) => {
  try {
    // req.user.id is available from the 'protect' and 'employerOnly' middleware
    const vehicles = await Vehicle.find({ employerId: req.user.id }).sort({ createdAt: -1 });
    res.json(vehicles);
  } catch (err) {
    console.error('Error fetching vehicles:', err);
    res.status(500).json({ message: 'Failed to fetch vehicles' });
  }
};

// @desc    Get a single vehicle by ID for the logged-in employer
// @route   GET /api/vehicles/:id
// @access  Private (Employer Only)
export const getVehicleById = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({ message: 'Invalid vehicle ID format.' });
    }
    const vehicle = await Vehicle.findOne({ _id: req.params.id, employerId: req.user.id });
    if (!vehicle) {
      return res.status(404).json({ message: "Vehicle not found or not associated with this employer." });
    }
    res.json(vehicle);
  } catch (err) {
    console.error('Error getting vehicle:', err);
    res.status(500).json({ message: 'Failed to get vehicle' });
  }
};

// @desc    Create a new vehicle for the logged-in employer
// @route   POST /api/vehicles
// @access  Private (Employer Only)
export const createVehicle = async (req, res) => {
  try {
    const { name, hours, wofRego } = req.body;

    // Basic validation
    if (!name || hours === undefined) { // Check for undefined as 0 is a valid hour
      return res.status(400).json({ message: "Vehicle name and hours are required." });
    }

    const numericHours = Number(hours);
    if (isNaN(numericHours) || numericHours < 0) {
      return res.status(400).json({ message: "Hours must be a valid non-negative number." });
    }

    // Optional: Check if a vehicle with the same name already exists for this employer
    const existingVehicle = await Vehicle.findOne({ name, employerId: req.user.id });
    if (existingVehicle) {
        return res.status(409).json({ message: `A vehicle named '${name}' already exists for this employer.`});
    }

    const vehicle = new Vehicle({
      name,
      hours: numericHours,
      wofRego,
      employerId: req.user.id, // Automatically associate with the logged-in employer
    });

    await vehicle.save();
    res.status(201).json(vehicle);
  } catch (err) {
    console.error('Error creating vehicle:', err);
    if (err.name === 'ValidationError') {
        return res.status(400).json({ message: err.message });
    }
    res.status(500).json({ message: 'Failed to create vehicle' });
  }
};

// @desc    Update a vehicle for the logged-in employer
// @route   PUT /api/vehicles/:id
// @access  Private (Employer Only)
export const updateVehicle = async (req, res) => {
  try {
    const vehicleId = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(vehicleId)) {
        return res.status(400).json({ message: 'Invalid vehicle ID format.' });
    }
    const { name, hours, wofRego } = req.body;

    const updateFields = {};
    if (name) updateFields.name = name;
    if (hours !== undefined) {
      const numericHours = Number(hours);
      if (isNaN(numericHours) || numericHours < 0) {
        return res.status(400).json({ message: "Hours must be a valid non-negative number." });
      }
      updateFields.hours = numericHours;
    }
    if (wofRego !== undefined) updateFields.wofRego = wofRego;

    // Find the vehicle ensuring it belongs to the logged-in employer
    const vehicle = await Vehicle.findOne({ _id: vehicleId, employerId: req.user.id });
    if (!vehicle) {
      return res.status(404).json({ message: "Vehicle not found or not associated with this employer." });
    }

    // If name is being changed, check for uniqueness within the employer's vehicles (excluding the current one)
    if (name && name !== vehicle.name) {
        const existingVehicleByName = await Vehicle.findOne({ name, employerId: req.user.id, _id: { $ne: vehicleId } });
        if (existingVehicleByName) {
          return res.status(409).json({ message: `Another vehicle named '${name}' already exists for this employer.` });
        }
    }

    const updated = await Vehicle.findByIdAndUpdate(
      vehicleId,
      { $set: updateFields },
      { new: true, runValidators: true }
    );

    if (!updated) { // Should not happen if findOne check passed, but good for safety
        return res.status(404).json({ message: 'Vehicle not found during update.' });
    }
    res.json(updated);
  } catch (err) {
    console.error('Error updating vehicle:', err);
    res.status(500).json({ message: 'Failed to update vehicle' });
  }
};

// @desc    Delete a vehicle for the logged-in employer
// @route   DELETE /api/vehicles/:id
// @access  Private (Employer Only)
export const deleteVehicle = async (req, res) => {
  try {
    const vehicleId = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(vehicleId)) {
        return res.status(400).json({ message: 'Invalid vehicle ID format.' });
    }

    const deletedVehicle = await Vehicle.findOneAndDelete({ _id: vehicleId, employerId: req.user.id });
    if (!deletedVehicle) {
        return res.status(404).json({ message: 'Vehicle not found or not associated with this employer.' });
    }
    // IMPORTANT: Handling associated reviews.
    // Option 1: Delete associated reviews (uncomment if this is the desired behavior)
    // await VehicleReview.deleteMany({ vehicle: req.params.id });
    res.json({ message: 'Vehicle deleted successfully' });
  } catch (err) {
    console.error('Error deleting vehicle:', err);
    res.status(500).json({ message: 'Failed to delete vehicle' });
  }
};

// --- Vehicle Review Routes ---

// @desc    Create a new vehicle review for a vehicle owned by the employer
// @route   POST /api/vehicles/reviews
// @access  Private (Employer Only or Employee if employeeId comes from req.user)
export const createVehicleReview = async (req, res) => {
  try {
    const { vehicle, dateReviewed, employeeId, oilChecked, vehicleChecked, vehicleBroken, notes, hours } = req.body;

    // Validate required fields
    if (!vehicle || !dateReviewed || !employeeId) {
        return res.status(400).json({ message: 'Missing required review fields (vehicle, dateReviewed, employeeId)' });
    }

    // Check if the vehicle exists and belongs to the employer
    const vehicleToReview = await Vehicle.findOne({ _id: vehicle, employerId: req.user.id });
    if (!vehicleToReview) {
      return res.status(404).json({ message: 'Vehicle not found or not associated with this employer.' });
    }

    // Check if the employee exists and belongs to the employer
    // (employeeId in req.body should be the _id of an Employee document)
    const employeeForReview = await Employee.findOne({ _id: employeeId, employerId: req.user.id });
    if (!employeeForReview) {
      return res.status(404).json({ message: 'Employee not found or not associated with this employer.' });
    }
    // If employeeId should be the logged-in user (if an employee is creating their own review)
    // const employeeForReview = await Employee.findOne({ userId: req.user.id, employerId: req.user.id }); // if employeeId is from req.user

    const review = new VehicleReview({
      vehicle,
      dateReviewed: new Date(dateReviewed), // Ensure date is stored as Date object
      employeeId,
      oilChecked: oilChecked ?? false, // Default to false if not provided
      vehicleChecked: vehicleChecked ?? false,
      vehicleBroken: vehicleBroken ?? false,
      notes,
      hours,
    });

    await review.save();
    // Optionally populate response
    const populatedReview = await VehicleReview.findById(review._id)
                                            .populate('vehicle', 'name wofRego')
                                            .populate('employeeId', 'name');
    res.status(201).json(populatedReview);
  } catch (err) {
    console.error('Error creating review:', err);
    res.status(500).json({ message: 'Failed to create review' });
  }
};

// @desc    Get all reviews for a specific vehicle owned by the employer
// @route   GET /api/vehicles/:vehicleId/reviews
// @access  Private (Employer Only)
export const getVehicleReviewsByVehicleId = async (req, res) => {
  try {
    const { vehicleId } = req.params;

    const vehicle = await Vehicle.findOne({ _id: vehicleId, employerId: req.user.id }).select('name wofRego');
    if (!vehicle) {
      return res.status(404).json({ message: 'Vehicle not found or not associated with this employer.' });
    }

    const reviews = await VehicleReview.find({ vehicle: vehicleId })
      .populate('employeeId', 'name') // Vehicle already fetched
      .sort({ dateReviewed: -1 }); // Sort by date descending
    // Return vehicle info along with reviews
    res.status(200).json({ vehicle, reviews });
  } catch (err) {
    console.error('Error fetching reviews for vehicle:', err);
    res.status(500).json({ message: 'Server error while fetching vehicle reviews' });
  }
};

// @desc    Get a single vehicle review by its ID, ensuring it's for a vehicle owned by the employer
// @route   GET /api/vehicles/reviews/:reviewId
// @access  Private (Employer Only)
export const getReviewById = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const review = await VehicleReview.findById(reviewId)
      .populate('vehicle', 'name wofRego')
      .populate('employeeId', 'name');

    if (review && review.vehicle) {
        const parentVehicle = await Vehicle.findById(review.vehicle._id);
        if (!parentVehicle || parentVehicle.employerId.toString() !== req.user.id.toString()) {
            return res.status(404).json({ message: 'Review not found or not associated with this employer.' });
        }
    }

    if (!review) return res.status(404).json({ message: 'Review not found' });

    res.status(200).json(review);
  } catch (err) {
    console.error('Error fetching review by ID:', err); // Keep detailed server log
    res.status(500).json({ message: 'Failed to fetch review' }); // Client-facing error
  }
};


// @desc    Get a vehicle (owned by employer) along with all its reviews
// @route   GET /api/vehicles/:vehicleId/with-reviews
// @access  Private (Employer Only)
export const getVehicleWithReviews = async (req, res) => {
  try {
    const { vehicleId } = req.params;

    const vehicle = await Vehicle.findOne({ _id: vehicleId, employerId: req.user.id });
    if (!vehicle) {
      return res.status(404).json({ message: 'Vehicle not found' });
    }

    const reviews = await VehicleReview.find({ vehicle: vehicleId })
      .populate('employeeId', 'name') // No need to populate vehicle again if returning the full vehicle object
      .sort({ dateReviewed: -1 });

    res.status(200).json({ vehicle, reviews });
  } catch (err) {
    console.error('Error fetching vehicle with reviews:', err); // Keep detailed server log
    res.status(500).json({ message: 'Server error while fetching vehicle and reviews' }); // Client-facing error
  }
};

// @desc    Update a vehicle review by its ID, ensuring it's for a vehicle owned by the employer
// @route   PUT /api/vehicles/reviews/:reviewId
// @access  Private (Employer Only)
export const updateReview = async (req, res) => {
  try {
    const { reviewId } = req.params;

    const reviewToUpdate = await VehicleReview.findById(reviewId).populate('vehicle');
    if (!reviewToUpdate || !reviewToUpdate.vehicle || reviewToUpdate.vehicle.employerId.toString() !== req.user.id.toString()) {
        return res.status(404).json({ message: 'Review not found or not associated with this employer.' });
    }

    // Prevent changing vehicle/employee via this route.
    // If employeeId can be changed, ensure the new employeeId also belongs to the employer.
    const { vehicle, employeeId, ...updateData } = req.body; // Prevent changing vehicle/employee via this route

    const updated = await VehicleReview.findByIdAndUpdate(reviewId, updateData, { new: true, runValidators: true })
                                      .populate('vehicle', 'name wofRego')
                                      .populate('employeeId', 'name');
    if (!updated) {
      return res.status(404).json({ message: 'Review not found for update' });
    }
    res.json(updated);
  } catch (err) {
    console.error('Error updating review:', err);
    res.status(500).json({ message: 'Failed to update review' });
  }
};


// @desc    Delete a vehicle review by its ID, ensuring it's for a vehicle owned by the employer
// @route   DELETE /api/vehicles/reviews/:reviewId
// @access  Private (Employer Only)
export const deleteReview = async (req, res) => {
  try {
    const { reviewId } = req.params;

    const reviewToDelete = await VehicleReview.findById(reviewId).populate('vehicle');
    if (!reviewToDelete || !reviewToDelete.vehicle || reviewToDelete.vehicle.employerId.toString() !== req.user.id.toString()) {
        return res.status(404).json({ message: 'Review not found or not associated with this employer.' });
    }

    const deletedReview = await VehicleReview.findByIdAndDelete(reviewId);
    if (!deletedReview) {
      return res.status(404).json({ message: 'Review not found for deletion' });
    }

    res.status(200).json({ message: 'Review deleted successfully' });
  } catch (err) {
    console.error('Error deleting review:', err);
    res.status(500).json({ message: 'Failed to delete review' });
  }
};

// --- Report Generation ---

// Helper function to generate filename
const generateReviewFilename = (review, extension) => {
  const vehicleName = review.vehicle?.name?.replace(/\s+/g, '_') || 'UnknownVehicle';
  const employeeName = review.employeeId?.name?.replace(/\s+/g, '_') || 'UnknownEmployee';
  const reviewDate = review.dateReviewed ? new Date(review.dateReviewed).toISOString().split('T')[0] : 'UnknownDate';
  return `Review_${vehicleName}_${employeeName}_${reviewDate}.${extension}`;
};

// @desc    Download a single vehicle review report (PDF or Excel)
// @route   GET /api/vehicles/reviews/:reviewId/download
// @access  Private (Employer Only)
export const downloadReviewReport = async (req, res) => {
const { reviewId } = req.params;
const { format = 'pdf' } = req.query; // Default to pdf

if (!['pdf', 'excel'].includes(format)) {
    return res.status(400).json({ message: 'Invalid format. Use "pdf" or "excel".' });
}

try {
  // Find the review and populate related vehicle and employee data
  const review = await VehicleReview.findById(reviewId)
    .populate('vehicle', 'name wofRego employerId') // Populate vehicle and include employerId for the check
    .populate('employeeId', 'name');

  // Check ownership: Ensure the review exists, is linked to a vehicle,
  // the vehicle has an employerId, and that employerId matches the logged-in user's ID.
  if (!review || !review.vehicle || !review.vehicle.employerId || review.vehicle.employerId.toString() !== req.user.id.toString()) {
    // If any of these conditions are not met, the review is not found or not owned by this employer.
    return res.status(404).json({ message: 'Review not found' });
  }

  // Proceed with report generation as the review is found and owned by the employer
  const filename = generateReviewFilename(review, format === 'pdf' ? 'pdf' : 'xlsx');

  if (format === 'pdf') {
    const doc = new PDFDocument({ margin: 50 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
    doc.pipe(res);

    // PDF Formatting (using review and populated data)
    doc.fontSize(16).font('Helvetica-Bold').text('Vehicle Review Report', { align: 'center' });
    doc.moveDown(2);

    doc.fontSize(12).font('Helvetica-Bold');
    doc.text(`Vehicle: `, { continued: true }).font('Helvetica').text(`${review.vehicle?.name || 'N/A'}`);
    doc.text(`WOF/Rego: `, { continued: true }).font('Helvetica').text(`${review.vehicle?.wofRego || 'N/A'}`); // Display as string
    doc.moveDown(0.5);
    doc.text(`Date Reviewed: `, { continued: true }).font('Helvetica').text(`${review.dateReviewed ? new Date(review.dateReviewed).toLocaleDateString() : 'N/A'}`);
    doc.text(`Employee: `, { continued: true }).font('Helvetica').text(`${review.employeeId?.name || 'N/A'}`);
    doc.moveDown(0.5);
    doc.text(`Hours Used: `, { continued: true }).font('Helvetica').text(`${review.hours ?? 'N/A'}`); // Use nullish coalescing
    doc.moveDown(1);
    doc.font('Helvetica-Bold').text('Checks:');
    doc.font('Helvetica');
    doc.list([
        `Oil Checked: ${review.oilChecked ? 'Yes' : 'No'}`,
        `Vehicle Checked: ${review.vehicleChecked ? 'Yes' : 'No'}`,
        `Vehicle Broken: ${review.vehicleBroken ? 'Yes' : 'No'}`
    ], { bulletRadius: 2 });
    doc.moveDown(1);
    doc.font('Helvetica-Bold').text('Notes:');
    doc.font('Helvetica').text(review.notes || 'N/A', { width: 410, align: 'justify' }); // Use available width

    doc.end();
  } else { // Excel format
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Review Report');

    // Add Title
    worksheet.mergeCells('A1:B1');
    worksheet.getCell('A1').value = 'Vehicle Review Report';
    worksheet.getCell('A1').font = { bold: true, size: 16 };
    worksheet.getCell('A1').alignment = { horizontal: 'center' };
    worksheet.addRow([]); // Spacer row

    worksheet.columns = [
      { header: 'Field', key: 'field', width: 25 },
      { header: 'Value', key: 'value', width: 50 },
    ];

    // Add rows with review data
    const data = [
      { field: 'Vehicle', value: review.vehicle?.name || 'N/A' },
      { field: 'WOF/Rego', value: review.vehicle?.wofRego || 'N/A' }, // Display as string
      { field: 'Date Reviewed', value: review.dateReviewed ? new Date(review.dateReviewed).toLocaleDateString() : 'N/A' },
      { field: 'Employee', value: review.employeeId?.name || 'N/A' },
      { field: 'Hours Used', value: review.hours ?? 'N/A' },
      { field: 'Oil Checked', value: review.oilChecked ? 'Yes' : 'No' },
      { field: 'Vehicle Checked', value: review.vehicleChecked ? 'Yes' : 'No' },
      { field: 'Vehicle Broken', value: review.vehicleBroken ? 'Yes' : 'No' },
      { field: 'Notes', value: review.notes || 'N/A' },
    ];
    worksheet.addRows(data);

    worksheet.getRow(3).font = { bold: true }; // Header row is now row 3
    worksheet.getRow(3).alignment = { vertical: 'middle' };
    worksheet.eachRow({ includeEmpty: false }, function(row, rowNumber) {
      if (rowNumber > 3) { // Start after header row
        row.getCell('B').alignment = { wrapText: true, vertical: 'top' };
      }
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
    const buffer = await workbook.xlsx.writeBuffer();
    res.send(buffer);
  }
} catch (error) {
  console.error('Error generating single review report:', error);
  console.error('Error details:', error.message, error.stack); // Log more details
  if (!res.headersSent) {
      res.status(500).json({ message: 'Internal server error generating report' });
  } else {
      console.error("Headers already sent, could not send error JSON response.");
      res.end(); // End the response if possible
  }
}
};

// @desc    Send a single vehicle review report via email
// @route   POST /api/vehicles/reviews/:reviewId/send-email
// @access  Private (Employer Only)
export const sendReviewReportByClient = async (req, res) => {
  const { reviewId } = req.params;
  let { email, format = 'pdf' } = req.body; // Default to pdf

  if (!email) {
    return res.status(400).json({ message: 'Email address is required.' });
  }
  // Validate format
  if (!['pdf', 'excel'].includes(format)) {
    return res.status(400).json({ message: 'Invalid format specified. Use "pdf" or "excel".' });
  }
  try {
    // Load the review, vehicle and employee data
    const review = await VehicleReview.findById(reviewId)
      .populate('vehicle', 'name wofRego employerId') // Include employerId for ownership check
      .populate('employeeId', 'name');
    // Check ownership
    if (!review || !review.vehicle || review.vehicle.employerId.toString() !== req.user.id.toString()) {
      return res.status(404).json({ message: 'Review not found.' });
    }

    let buffer;
    let filename = generateReviewFilename(review, format === 'excel' ? 'xlsx' : 'pdf');
    let contentType;
    const subject = `Vehicle Review Report: ${review.vehicle?.name || 'N/A'} (${new Date(review.dateReviewed).toLocaleDateString()})`;
    const textBody = `Please find attached the ${format.toUpperCase()} review report for vehicle "${review.vehicle?.name || 'N/A'}" reviewed by ${review.employeeId?.name || 'N/A'} on ${new Date(review.dateReviewed).toLocaleDateString()}.`;

    if (format === 'pdf') {
      contentType = 'application/pdf';
      buffer = await new Promise((resolve, reject) => {
        const doc = new PDFDocument({ margin: 50 });
        const chunks = [];
        doc.on('data', (chunk) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        // PDF content (same as download function)
        doc.fontSize(16).font('Helvetica-Bold').text('Vehicle Review Report', { align: 'center' });
        doc.moveDown(2);
        doc.fontSize(12).font('Helvetica-Bold');
        doc.text(`Vehicle: `, { continued: true }).font('Helvetica').text(`${review.vehicle?.name || 'N/A'}`);
        doc.text(`WOF/Rego: `, { continued: true }).font('Helvetica').text(`${review.vehicle?.wofRego || 'N/A'}`); // Display as string
        doc.moveDown(0.5);
        doc.text(`Date Reviewed: `, { continued: true }).font('Helvetica').text(`${review.dateReviewed ? new Date(review.dateReviewed).toLocaleDateString() : 'N/A'}`);
        doc.text(`Employee: `, { continued: true }).font('Helvetica').text(`${review.employeeId?.name || 'N/A'}`);
        doc.moveDown(0.5);
        doc.text(`Hours Used: `, { continued: true }).font('Helvetica').text(`${review.hours ?? 'N/A'}`);
        doc.moveDown(1);
        doc.font('Helvetica-Bold').text('Checks:');
        doc.font('Helvetica');
        doc.list([
            `Oil Checked: ${review.oilChecked ? 'Yes' : 'No'}`,
            `Vehicle Checked: ${review.vehicleChecked ? 'Yes' : 'No'}`,
            `Vehicle Broken: ${review.vehicleBroken ? 'Yes' : 'No'}`
        ], { bulletRadius: 2 });
        doc.moveDown(1);
        doc.font('Helvetica-Bold').text('Notes:');
        doc.font('Helvetica').text(review.notes || 'N/A', { width: 410, align: 'justify' });

        doc.end();
      });
    } else { // Excel format
      contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Review Report');

      worksheet.mergeCells('A1:B1');
      worksheet.getCell('A1').value = 'Vehicle Review Report';
      worksheet.getCell('A1').font = { bold: true, size: 16 };
      worksheet.getCell('A1').alignment = { horizontal: 'center' };
      worksheet.addRow([]); 

      worksheet.columns = [
        { header: 'Field', key: 'field', width: 25 },
        { header: 'Value', key: 'value', width: 50 },
      ];
      const data = [
        { field: 'Vehicle', value: review.vehicle?.name || 'N/A' },
        { field: 'WOF/Rego', value: review.vehicle?.wofRego || 'N/A' },
        { field: 'Date Reviewed', value: review.dateReviewed ? new Date(review.dateReviewed).toLocaleDateString() : 'N/A' },
        { field: 'Employee', value: review.employeeId?.name || 'N/A' },
        { field: 'Hours Used', value: review.hours ?? 'N/A' },
        { field: 'Oil Checked', value: review.oilChecked ? 'Yes' : 'No' },
        { field: 'Vehicle Checked', value: review.vehicleChecked ? 'Yes' : 'No' },
        { field: 'Vehicle Broken', value: review.vehicleBroken ? 'Yes' : 'No' },
        { field: 'Notes', value: review.notes || 'N/A' },
      ];
      worksheet.addRows(data);
      worksheet.getRow(3).font = { bold: true };
      worksheet.getRow(3).alignment = { vertical: 'middle' };
      worksheet.getCell('B9').alignment = { wrapText: true, vertical: 'top' }; // Assuming Notes is the 9th data item (row 3 + 7 = 10, cell B10)
      buffer = await workbook.xlsx.writeBuffer();
    }

    // Send email with attachment
    const transporter = nodemailer.createTransport({
      service: 'gmail', // TODO: Make email service configurable via environment variables
      auth: {
        user: process.env.EMAIL_USER, // Ensure these are set in your environment
        pass: process.env.EMAIL_PASS,
      },
    });

    await transporter.sendMail({
      from: `"Vehicle Manager" <${process.env.EMAIL_USER}>`, // Customize sender name
      to: email, // The recipient email from the request body
      subject: subject,
      text: textBody,
      attachments: [
        {
          filename,
          content: buffer,
          contentType,
        },
      ],
    });

    res.status(200).json({ message: 'Review report sent successfully via email.' });
  } catch (error) {
    console.error('Error sending review report by email:', error);
    console.error('Error details:', error.message, error.stack); // Log more details
    res.status(500).json({ message: `Failed to send review report via email: ${error.message}` });
  }
};

// @desc    Download a multi-review report for a specific vehicle (Excel only)
// @route   GET /api/vehicles/:vehicleId/report/download
// @access  Private (Employer Only)
export const downloadVehicleReport = async (req, res) => {
  try {
    const { vehicleId } = req.params;
    const { startDate, endDate } = req.query;

    // Validate inputs
    if (!vehicleId) {
        return res.status(400).json({ message: 'Vehicle ID is required.' });
    }
    // Basic date validation (more robust validation might be needed)
    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;

    if (start && isNaN(start.getTime())) {
        return res.status(400).json({ message: 'Invalid start date format.' });
    }
    if (end && isNaN(end.getTime())) {
        return res.status(400).json({ message: 'Invalid end date format.' });
    }
    // Set end date to end of day
    if (end) {
        end.setHours(23, 59, 59, 999);
    }

    const vehicle = await Vehicle.findOne({ _id: vehicleId, employerId: req.user.id }).lean();
    if (!vehicle) {
        return res.status(404).json({ message: 'Vehicle not found or not associated with this employer.' });
    }

    // Build query for reviews
    const reviewQuery = {
      vehicle: vehicleId,
    };
    if (start || end) {
        reviewQuery.dateReviewed = {};
        if (start) reviewQuery.dateReviewed.$gte = start;
        if (end) reviewQuery.dateReviewed.$lte = end;
    }

    const reviews = await VehicleReview.find(reviewQuery)
                                        .populate('employeeId', 'name') // Only need employee name
                                        .sort({ dateReviewed: -1 }); // Sort by date
    // TODO: REFACTOR_EXCEL_VEHICLE_HISTORY - Consider refactoring Excel generation into a reusable helper.

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Vehicle Management System'; // Optional metadata
    workbook.lastModifiedBy = 'System';
    workbook.created = new Date();
    workbook.modified = new Date();

    // --- Sheet 1: Vehicle Summary ---
    const summarySheet = workbook.addWorksheet('Vehicle Summary');
    summarySheet.mergeCells('A1:C1');
    summarySheet.getCell('A1').value = `Vehicle Summary Report: ${vehicle.name}`;
    summarySheet.getCell('A1').font = { bold: true, size: 16, name: 'Calibri' };
    summarySheet.getCell('A1').alignment = { horizontal: 'center' };

    summarySheet.addRow([]); // Spacer
    const summaryHeaderRow = summarySheet.addRow(['Vehicle Name', 'Current Hours', 'WOF/Rego Due']);
    summaryHeaderRow.font = { bold: true, name: 'Calibri' };
    summaryHeaderRow.eachCell(cell => cell.alignment = { horizontal: 'center' });

    const summaryDataRow = summarySheet.addRow([
      vehicle.name || 'N/A',
      vehicle.hours ?? 'N/A', // Use current hours from vehicle model
      vehicle.wofRego || 'N/A', // Display as string, not formatted date
    ]);
    summaryDataRow.eachCell(cell => cell.alignment = { horizontal: 'center' });

    // Auto-fit columns for summary
    summarySheet.columns.forEach(column => {
        let maxLength = 0;
        column.eachCell({ includeEmpty: true }, cell => {
            let columnLength = cell.value ? cell.value.toString().length : 10;
            if (columnLength > maxLength) {
                maxLength = columnLength;
            }
        });
        column.width = maxLength < 15 ? 15 : maxLength + 2; // Basic auto-width
    });


    // --- Sheet 2: Review History ---
    const historySheet = workbook.addWorksheet('Review History');
    const historyColumns = [
      { header: 'Date Reviewed', key: 'date', width: 15 },
      { header: 'Employee Name', key: 'employee', width: 25 },
      { header: 'Hours Recorded', key: 'hours', width: 15 }, // Changed header for clarity
      { header: 'Oil Checked', key: 'oilChecked', width: 15 },
      { header: 'Vehicle Checked', key: 'vehicleChecked', width: 18 },
      { header: 'Vehicle Broken', key: 'vehicleBroken', width: 18 },
      // { header: 'Photos', key: 'photos', width: 30 }, // Photos might be URLs, consider how to display
      { header: 'Notes', key: 'notes', width: 40 },
    ];
    historySheet.columns = historyColumns;
    historySheet.getRow(1).font = { bold: true, name: 'Calibri' };
    historySheet.getRow(1).alignment = { vertical: 'middle' };

    if (reviews.length === 0) {
      historySheet.mergeCells('A2:G2'); // Merge across defined columns
      historySheet.getCell('A2').value = 'No reviews found for this vehicle in the specified date range.';
      historySheet.getCell('A2').alignment = { horizontal: 'center' };
      historySheet.getCell('A2').font = { italic: true };
    } else {
      reviews.forEach((r) => {
        historySheet.addRow({
          date: r.dateReviewed ? new Date(r.dateReviewed).toLocaleDateString() : 'N/A',
          employee: r.employeeId?.name || 'N/A',
          hours: r.hours ?? 'N/A', // Hours recorded *during* the review
          oilChecked: r.oilChecked ? 'Yes' : 'No',
          vehicleChecked: r.vehicleChecked ? 'Yes' : 'No',
          vehicleBroken: r.vehicleBroken ? 'Yes' : 'No',
          // photos: Array.isArray(r.photos) ? r.photos.join(', ') : (r.photos || 'N/A'), // Handle photos if needed
          notes: r.notes || '', // Use empty string instead of N/A for notes
        });
      });
       // Apply wrap text to notes column
       historySheet.getColumn('notes').alignment = { wrapText: true, vertical: 'top' };
    }

    // --- Send the file ---
    const filename = `${vehicle.name.replace(/\s+/g, '_')}_Report_${startDate ? startDate : 'Start'}_to_${endDate ? endDate : 'End'}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    await workbook.xlsx.write(res);
    res.end(); // End the response stream

  } catch (err) {
    console.error('Error generating vehicle Excel report:', err);
     if (!res.headersSent) {
        res.status(500).json({ message: 'Error generating vehicle Excel report' });
    } else {
        console.error("Headers already sent, could not send error JSON response.");
        res.end();
    }
  }
};

// @desc    Send a multi-review report for a specific vehicle via email (Excel only)
// @route   POST /api/vehicles/:vehicleId/report/send-email
// @access  Private (Employer Only)
export const sendVehicleReportByEmail = async (req, res) => {
  try {
    const { vehicleId } = req.params;
    const { startDate, endDate, email } = req.body;

    // Validate inputs
    if (!vehicleId || !email) {
      return res.status(400).json({ message: "Vehicle ID and Email are required." });
    }
    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;
    if (start && isNaN(start.getTime())) return res.status(400).json({ message: 'Invalid start date format.' });
    if (end && isNaN(end.getTime())) return res.status(400).json({ message: 'Invalid end date format.' });
    if (end) end.setHours(23, 59, 59, 999);

    const vehicle = await Vehicle.findOne({ _id: vehicleId, employerId: req.user.id }).lean();
    if (!vehicle) {
        return res.status(404).json({ message: 'Vehicle not found or not associated with this employer.' });
    }

    // Build query
    const reviewQuery = { vehicle: vehicleId };
    if (start || end) {
        reviewQuery.dateReviewed = {};
        if (start) reviewQuery.dateReviewed.$gte = start;
        if (end) reviewQuery.dateReviewed.$lte = end; // Corrected: was $lte = start
    }

    const reviews = await VehicleReview.find(reviewQuery)
                                        .populate('employeeId', 'name')
                                        .sort({ dateReviewed: -1 });

    // Don't send email if no reviews, inform user
    if (reviews.length === 0) {
      return res.status(404).json({ message: 'No reviews found for this vehicle in the selected date range. Email not sent.' });
    }

    // --- Generate Excel Workbook (Similar to downloadVehicleReport) ---
    // TODO: REFACTOR_EXCEL_VEHICLE_HISTORY - Use the same refactored helper as in downloadVehicleReport.

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Vehicle Management System';
    workbook.created = new Date();

    // Sheet 1: Summary
    const summarySheet = workbook.addWorksheet('Vehicle Summary');
    summarySheet.mergeCells('A1:C1');
    summarySheet.getCell('A1').value = `Vehicle Summary Report: ${vehicle.name}`;
    summarySheet.getCell('A1').font = { bold: true, size: 16, name: 'Calibri' };
    summarySheet.getCell('A1').alignment = { horizontal: 'center' };
    summarySheet.addRow([]);
    const summaryHeaderRow = summarySheet.addRow(['Vehicle Name', 'Current Hours', 'WOF/Rego Due']);
    summaryHeaderRow.font = { bold: true, name: 'Calibri' };
    summaryHeaderRow.eachCell(cell => cell.alignment = { horizontal: 'center' });
    const summaryDataRow = summarySheet.addRow([
      vehicle.name || 'N/A',
      vehicle.hours ?? 'N/A',
      vehicle.wofRego || 'N/A', // Display as string, not formatted date
    ]);
    summaryDataRow.eachCell(cell => cell.alignment = { horizontal: 'center' });
    summarySheet.columns.forEach(column => {
        let maxLength = 0;
        column.eachCell({ includeEmpty: true }, cell => {
            let columnLength = cell.value ? cell.value.toString().length : 10;
            if (columnLength > maxLength) maxLength = columnLength;
        });
        column.width = maxLength < 15 ? 15 : maxLength + 2;
    });

    // Sheet 2: History
    const historySheet = workbook.addWorksheet('Review History');
    const historyColumns = [
      { header: 'Date Reviewed', key: 'date', width: 15 },
      { header: 'Employee Name', key: 'employee', width: 25 },
      { header: 'Hours Recorded', key: 'hours', width: 15 },
      { header: 'Oil Checked', key: 'oilChecked', width: 15 },
      { header: 'Vehicle Checked', key: 'vehicleChecked', width: 18 },
      { header: 'Vehicle Broken', key: 'vehicleBroken', width: 18 },
      { header: 'Notes', key: 'notes', width: 40 },
    ];
    historySheet.columns = historyColumns;
    historySheet.getRow(1).font = { bold: true, name: 'Calibri' };
    historySheet.getRow(1).alignment = { vertical: 'middle' };

    reviews.forEach((r) => {
      historySheet.addRow({
        date: r.dateReviewed ? new Date(r.dateReviewed).toLocaleDateString() : 'N/A',
        employee: r.employeeId?.name || 'N/A',
        hours: r.hours ?? 'N/A', // Hours recorded *during* the review
        oilChecked: r.oilChecked ? 'Yes' : 'No',
        vehicleChecked: r.vehicleChecked ? 'Yes' : 'No',
        vehicleBroken: r.vehicleBroken ? 'Yes' : 'No',
        notes: r.notes || '',
      });
    });
    historySheet.getColumn('notes').alignment = { wrapText: true, vertical: 'top' };

    // --- Write to buffer and Send Email ---
    const buffer = await workbook.xlsx.writeBuffer();
    const formattedStart = start ? start.toLocaleDateString() : 'Start';
    const formattedEnd = end ? end.toLocaleDateString() : 'End';
    const filename = `${vehicle.name.replace(/\s+/g, '_')}_Report_${formattedStart}_to_${formattedEnd}.xlsx`;

    const transporter = nodemailer.createTransport({
      service: 'gmail', // TODO: Make email service configurable
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: `"Vehicle Manager" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: `Vehicle Report: ${vehicle.name} (${formattedStart} - ${formattedEnd})`,
      text: `Attached is the vehicle report for ${vehicle.name} covering the period from ${formattedStart} to ${formattedEnd}.`,
      attachments: [
        {
          filename,
          content: buffer,
          contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        },
      ],
    };

    await transporter.sendMail(mailOptions);
    res.status(200).json({ message: 'Vehicle report sent successfully via email.' });

  } catch (error) {
    console.error('Error sending vehicle report email:', error);
    console.error('Error details:', error.message, error.stack); // Log more details
    res.status(500).json({ message: `Failed to send review report via email: ${error.message}` }); // Send error message to frontend
  }
};

// --- Aggregate Reports ---

// @desc    Download a report for ALL vehicles and their reviews (Excel only)
// @route   GET /api/vehicles/report/all/download
// @access  Private (Employer Only)
export const downloadAllVehiclesReport = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;
    if (start && isNaN(start.getTime())) return res.status(400).json({ message: 'Invalid start date format.' });
    if (end && isNaN(end.getTime())) return res.status(400).json({ message: 'Invalid end date format.' });
    if (end) end.setHours(23, 59, 59, 999);

    // Fetch all vehicles efficiently
    const vehicles = await Vehicle.find({ employerId: req.user.id }).lean();
    if (!vehicles || vehicles.length === 0) {
      return res.status(404).json({ message: 'No vehicles found in the system.' });
    }

    const vehicleIds = vehicles.map(v => v._id);

    // Build review query
    const reviewQueryBase = { vehicle: { $in: vehicleIds } };
    if (start || end) {
        reviewQueryBase.dateReviewed = {};
        if (start) reviewQueryBase.dateReviewed.$gte = start;
        if (end) reviewQueryBase.dateReviewed.$lte = end;
    }


    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Vehicle Management System';
    workbook.created = new Date();
    const mainSheet = workbook.addWorksheet('All Vehicles Report');

    // Define columns once for the main sheet
    // Columns should only reflect Vehicle model fields
    const columns = [
        { header: 'Vehicle Name', key: 'vehicleName', width: 25 },
        { header: 'Current Hours', key: 'hours', width: 15 },
        { header: 'WOF/Rego Due', key: 'wofRego', width: 15 },
    ];
    mainSheet.columns = columns;
    mainSheet.getRow(1).font = { bold: true, name: 'Calibri' };
    mainSheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

    // Loop through vehicles and use pre-fetched reviews
    for (const vehicle of vehicles) {
        // Add a row for each vehicle using only vehicle data, as per the defined columns
        mainSheet.addRow({
            vehicleName: vehicle.name || 'N/A',
            hours: vehicle.hours ?? 'N/A',
            wofRego: vehicle.wofRego || 'N/A', // Display as string, not formatted date
        });
    }
    // TODO: REFACTOR_EXCEL_ALL_VEHICLES - Consider refactoring the workbook generation into a helper function.
    // This helper would return an ExcelJS.Workbook instance.

    // Handle case where no reviews were found for any vehicle in the range
    // This message is no longer relevant as we are not reporting on reviews
    // If no vehicles were found, we return 404 earlier.
    // If vehicles were found but no reviews, the sheet will just list vehicles.

    // Apply alignment to header cells
    mainSheet.getRow(1).eachCell(cell => {
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.font = { bold: true };
    }); 


    // --- Send the file ---
    const formattedStart = start ? start.toISOString().split('T')[0] : 'Start';
    const formattedEnd = end ? end.toISOString().split('T')[0] : 'End';
    const filename = `All_Vehicles_Report_${formattedStart}_to_${formattedEnd}.xlsx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    await workbook.xlsx.write(res);
    res.end();

  } catch (error) {
    console.error('Error downloading all vehicles report:', error);
     if (!res.headersSent) {
        res.status(500).json({ message: 'Internal server error generating all vehicles report' });
    } else {
        console.error("Headers already sent, could not send error JSON response.");
        res.end();
    }
  }
};

// @desc    Send a report for ALL vehicles and their reviews via email (Excel only)
// @route   POST /api/vehicles/report/all/send-email
// @access  Private (Employer Only)
export const sendAllVehiclesReportByEmail = async (req, res) => {
  try {
    const { startDate, endDate, email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Recipient email address is required' });
    }

    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null; // Corrected: was $lte = start
    if (start && isNaN(start.getTime())) return res.status(400).json({ error: 'Invalid start date format.' });
    if (end && isNaN(end.getTime())) return res.status(400).json({ error: 'Invalid end date format.' });
    if (end) end.setHours(23, 59, 59, 999);

    const formattedStart = start ? start.toLocaleDateString() : 'Start';
    const formattedEnd = end ? end.toLocaleDateString() : 'End';

    // Fetch all vehicles
    const vehicles = await Vehicle.find({ employerId: req.user.id }).lean();
    if (!vehicles || vehicles.length === 0) {
      return res.status(404).json({ message: 'No vehicles found. Email not sent.' });
    }

    const vehicleIds = vehicles.map(v => v._id);

    // Build review query
    const reviewQueryBase = { vehicle: { $in: vehicleIds } };
    if (start || end) {
        reviewQueryBase.dateReviewed = {};
        if (start) reviewQueryBase.dateReviewed.$gte = start;
        if (end) reviewQueryBase.dateReviewed.$lte = end;
    }

    // Fetch all relevant reviews
    const allReviews = await VehicleReview.find(reviewQueryBase)
        .sort({ vehicle: 1, dateReviewed: -1 })
        .populate('employeeId', 'name')
        .lean();

    const reviewsByVehicleId = allReviews.reduce((acc, review) => {
        const vehicleIdString = review.vehicle.toString();
        if (!acc[vehicleIdString]) acc[vehicleIdString] = [];
        acc[vehicleIdString].push(review);
        return acc;
    }, {});

    // --- Generate Excel Workbook (Similar to downloadAllVehiclesReport) ---
    // TODO: REFACTOR_EXCEL_ALL_VEHICLES - Use the same refactored helper as in downloadAllVehiclesReport.
    const columns = [
        { header: 'Vehicle Name', key: 'vehicleName', width: 25 },
        { header: 'Current Hours', key: 'hours', width: 15 }, // Changed from 'Date Reviewed'
        { header: 'WOF/Rego Due', key: 'wofRego', width: 15 }, // Changed from 'Employee Name'
        // Removed review-specific columns
    ];
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Vehicle Management System';
    workbook.created = new Date();
    const mainSheet = workbook.addWorksheet('All Vehicles Report');
    mainSheet.columns = columns;
    mainSheet.getRow(1).font = { bold: true, name: 'Calibri' };
    mainSheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };


    for (const vehicle of vehicles) {
      // We are only reporting vehicle data, not iterating through reviews for this report type
      mainSheet.addRow({
        vehicleName: vehicle.name || 'N/A',
        hours: vehicle.hours ?? 'N/A',
        wofRego: vehicle.wofRego || 'N/A', // Display as string
      });
    }
    
    mainSheet.getRow(1).eachCell(cell => { // Style header row
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.font = { bold: true };
    });


    // --- Write to buffer and Send Email ---
    const buffer = await workbook.xlsx.writeBuffer();
    const filename = `All_Vehicles_Report_${formattedStart}_to_${formattedEnd}.xlsx`;

    const transporter = nodemailer.createTransport({
      service: 'gmail', // TODO: Make email service configurable
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    await transporter.sendMail({
      from: `"Vehicle Manager" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: `All Vehicles Report (${formattedStart} - ${formattedEnd})`,
      text: `Hello,\n\nAttached is the consolidated vehicle report covering the period from ${formattedStart} to ${formattedEnd}.\n\nRegards,\nVehicle Management System`,
      attachments: [
        {
          filename,
          content: buffer,
          contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        },
      ],
    });

    res.status(200).json({ message: 'All vehicles report sent successfully via email!' });
  } catch (error) {
    console.error('Error sending all vehicles report email:', error);
    res.status(500).json({ message: `Failed to send all vehicles report email. ${error.message}` });
  }
};
