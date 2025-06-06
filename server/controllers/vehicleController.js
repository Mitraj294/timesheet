import PDFDocument from 'pdfkit';
import ExcelJS from 'exceljs';
import nodemailer from 'nodemailer';
import Vehicle from '../models/Vehicle.js';
import VehicleReview from '../models/VehicleReview.js';
import Employee from '../models/Employee.js';
import mongoose from 'mongoose';

// Get all vehicles for the logged-in user
export const getVehicles = async (req, res) => {
  try {
    let vehicles = [];
    const userId = req.user.id;
    const role = req.user.role;

    if (role === 'employer') {
      vehicles = await Vehicle.find({ employerId: userId });
    } else if (role === 'employee') {
      const employee = await Employee.findOne({ userId });
      if (employee && employee.employerId) {
        vehicles = await Vehicle.find({ employerId: employee.employerId });
      } else {
        vehicles = [];
      }
    } else {
      return res.status(403).json({ message: "Access denied for this role." });
    }
    res.json(vehicles);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch vehicles' });
  }
};

// Get a single vehicle by ID (with access control)
export const getVehicleById = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid vehicle ID format.' });
    }
    const vehicle = await Vehicle.findById(req.params.id);

    let employee = null;
    if (req.user.role === 'employee') {
      employee = await Employee.findOne({ userId: req.user.id });
      if (!employee || !employee.employerId) {
        return res.status(403).json({ message: "Access denied." });
      }
    }

    const isEmployer = vehicle && vehicle.employerId.toString() === req.user.id.toString();
    const isEmployee = req.user.role === 'employee' && employee && vehicle && vehicle.employerId.toString() === employee.employerId.toString();

    if (!isEmployer && !isEmployee) {
      return res.status(404).json({ message: "Vehicle not found or you do not have access." });
    }
    res.json(vehicle);
  } catch (err) {
    res.status(500).json({ message: 'Failed to get vehicle' });
  }
};

// Create a new vehicle (employer only)
export const createVehicle = async (req, res) => {
  try {
    const { name, hours, wofRego } = req.body;
    if (!name || !hours) {
      return res.status(400).json({ message: "Vehicle name and hours are required." });
    }
    const numericHours = Number(hours);
    if (isNaN(numericHours) || numericHours < 0) {
      return res.status(400).json({ message: "Hours must be a valid non-negative number." });
    }
    const exists = await Vehicle.findOne({ name, employerId: req.user.id });
    if (exists) {
      return res.status(409).json({ message: `A vehicle named '${name}' already exists.` });
    }
    const vehicle = new Vehicle({
      name,
      hours: numericHours,
      wofRego,
      employerId: req.user.id,
    });
    await vehicle.save();
    res.status(201).json(vehicle);
  } catch (err) {
    if (err.name === 'ValidationError') {
      return res.status(400).json({ message: err.message });
    }
    res.status(500).json({ message: 'Failed to create vehicle' });
  }
};

// Update a vehicle (employer only)
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

    const vehicle = await Vehicle.findOne({ _id: vehicleId, employerId: req.user.id });
    if (!vehicle) {
      return res.status(404).json({ message: "Vehicle not found or not associated with this employer." });
    }
    if (name && name !== vehicle.name) {
      const exists = await Vehicle.findOne({ name, employerId: req.user.id, _id: { $ne: vehicleId } });
      if (exists) {
        return res.status(409).json({ message: `Another vehicle named '${name}' already exists.` });
      }
    }
    const updated = await Vehicle.findByIdAndUpdate(
      vehicleId,
      { $set: updateFields },
      { new: true, runValidators: true }
    );
    if (!updated) {
      return res.status(404).json({ message: 'Vehicle not found during update.' });
    }
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: 'Failed to update vehicle' });
  }
};

// Delete a vehicle (employer only)
export const deleteVehicle = async (req, res) => {
  try {
    const vehicleId = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(vehicleId)) {
      return res.status(400).json({ message: 'Invalid vehicle ID format.' });
    }
    const deleted = await Vehicle.findOneAndDelete({ _id: vehicleId, employerId: req.user.id });
    if (!deleted) {
      return res.status(404).json({ message: 'Vehicle not found or not associated with this employer.' });
    }
    // Optionally delete associated reviews
    // await VehicleReview.deleteMany({ vehicle: req.params.id });
    res.json({ message: 'Vehicle deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete vehicle' });
  }
};

// --- Vehicle Review Routes ---

// Create a new vehicle review
export const createVehicleReview = async (req, res) => {
  console.log("POST /api/vehicles/:vehicleId/reviews called with params:", req.params, "body:", req.body);
  try {
    const { vehicleId } = req.params;
    const { dateReviewed, oilChecked, vehicleChecked, vehicleBroken, notes, hours, employeeId } = req.body;
    const userId = req.user.id;
    const role = req.user.role;

    if (!dateReviewed) {
      return res.status(400).json({ message: 'Missing required review field: dateReviewed' });
    }
    if (!mongoose.Types.ObjectId.isValid(vehicleId)) {
      return res.status(400).json({ message: 'Invalid vehicle ID format.' });
    }

    let employee;
    if (role === 'employer') {
      // Use employeeId from body
      if (!employeeId || !mongoose.Types.ObjectId.isValid(employeeId)) {
        return res.status(400).json({ message: 'Valid employeeId is required.' });
      }
      employee = await Employee.findById(employeeId);
      if (!employee) {
        return res.status(404).json({ message: 'Employee record not found.' });
      }
    } else if (role === 'employee') {
      employee = await Employee.findOne({ userId });
      if (!employee) {
        return res.status(404).json({ message: 'Employee record not found.' });
      }
    } else {
      return res.status(403).json({ message: 'Access denied.' });
    }

    const vehicle = await Vehicle.findById(vehicleId);
    if (!vehicle) {
      return res.status(404).json({ message: 'Vehicle not found.' });
    }
    const isEmployer = role === 'employer' && vehicle.employerId.toString() === userId.toString();
    const isEmployee = role === 'employee' && employee.employerId && vehicle.employerId.toString() === employee.employerId.toString();
    if (!isEmployer && !isEmployee) {
      return res.status(403).json({ message: 'Access denied.' });
    }
    const review = new VehicleReview({
      vehicle: vehicleId,
      dateReviewed: new Date(dateReviewed),
      employeeId: employee._id,
      oilChecked: oilChecked ?? false,
      vehicleChecked: vehicleChecked ?? false,
      vehicleBroken: vehicleBroken ?? false,
      notes,
      hours,
    });
    await review.save();
    const populated = await VehicleReview.findById(review._id)
      .populate('vehicle', 'name wofRego')
      .populate('employeeId', 'name');
    res.status(201).json(populated);
  } catch (err) {
    res.status(500).json({ message: 'Failed to create review' });
  }
};

// Get all reviews for a specific vehicle
export const getVehicleReviewsByVehicleId = async (req, res) => {
  try {
    const { vehicleId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(vehicleId)) {
      return res.status(400).json({ message: 'Invalid vehicle ID format.' });
    }
    const vehicle = await Vehicle.findById(vehicleId);
    if (!vehicle) {
      return res.status(404).json({ message: 'Vehicle not found.' });
    }
    let employee = null;
    if (req.user.role === 'employee') {
      employee = await Employee.findOne({ userId: req.user.id }).select('employerId');
      if (!employee || !employee.employerId) {
        return res.status(403).json({ message: "Access denied." });
      }
    }
    const isEmployer = vehicle.employerId.toString() === req.user.id.toString();
    const isEmployee = req.user.role === 'employee' && employee && vehicle.employerId.toString() === employee.employerId.toString();
    if (!isEmployer && !isEmployee) {
      return res.status(404).json({ message: "Vehicle not found or you do not have access to its reviews." });
    }
    const reviews = await VehicleReview.find({ vehicle: vehicleId })
      .populate('employeeId', 'name')
      .sort({ dateReviewed: -1 });
    res.status(200).json(reviews);
  } catch (err) {
    res.status(500).json({ message: 'Server error while fetching vehicle reviews' });
  }
};

// Get a single vehicle review by its ID
export const getReviewById = async (req, res) => {
  try {
    const { reviewId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(reviewId)) {
      return res.status(400).json({ message: 'Invalid review ID format.' });
    }
    const review = await VehicleReview.findById(reviewId).populate('vehicle', 'name wofRego employerId');
    let employee = null;
    if (req.user.role === 'employee') {
      employee = await Employee.findOne({ userId: req.user.id }).select('employerId');
      if (!employee || !employee.employerId) {
        return res.status(403).json({ message: "Access denied." });
      }
    }
    const isEmployer = review && review.vehicle && review.vehicle.employerId && review.vehicle.employerId.toString() === req.user.id.toString();
    const isEmployee = req.user.role === 'employee' && employee && review && review.vehicle && review.vehicle.employerId && review.vehicle.employerId.toString() === employee.employerId.toString();
    if (!review || !review.vehicle || (!isEmployer && !isEmployee)) {
      return res.status(404).json({ message: 'Review not found or access denied.' });
    }
    const finalReview = await VehicleReview.findById(review._id)
      .populate('vehicle', 'name wofRego')
      .populate('employeeId', 'name');
    res.status(200).json(finalReview);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch review' });
  }
};

// Get a vehicle along with all its reviews
export const getVehicleWithReviews = async (req, res) => {
  try {
    const { vehicleId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(vehicleId)) {
      return res.status(400).json({ message: 'Invalid vehicle ID format.' });
    }
    const vehicle = await Vehicle.findById(vehicleId);
    let employee = null;
    if (req.user.role === 'employee') {
      employee = await Employee.findOne({ userId: req.user.id }).select('employerId');
      if (!employee || !employee.employerId) {
        return res.status(403).json({ message: "Access denied." });
      }
    }
    const isEmployer = vehicle && vehicle.employerId && vehicle.employerId.toString() === req.user.id.toString();
    const isEmployee = req.user.role === 'employee' && employee && vehicle && vehicle.employerId && vehicle.employerId.toString() === employee.employerId.toString();
    if (!isEmployer && !isEmployee) {
      return res.status(404).json({ message: "Vehicle not found or you do not have access." });
    }
    const reviews = await VehicleReview.find({ vehicle: vehicleId })
      .populate('employeeId', 'name')
      .sort({ dateReviewed: -1 });
    res.status(200).json({ vehicle, reviews });
  } catch (err) {
    res.status(500).json({ message: 'Server error while fetching vehicle and reviews' });
  }
};

// Update a vehicle review by its ID
export const updateReview = async (req, res) => {
  try {
    const { reviewId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(reviewId)) {
      return res.status(400).json({ message: 'Invalid review ID format.' });
    }
    const review = await VehicleReview.findById(reviewId).populate('vehicle').populate('employeeId');
    let employee = null;
    if (req.user.role === 'employee') {
      employee = await Employee.findOne({ userId: req.user.id }).select('_id');
      if (!employee) {
        return res.status(403).json({ message: "Access denied." });
      }
    }
    const isEmployer = review && review.vehicle && review.vehicle.employerId && review.vehicle.employerId.toString() === req.user.id.toString();
    const isReviewOwner = req.user.role === 'employee' && review && review.employeeId && review.employeeId._id.toString() === employee?._id.toString();
    if (!review || !review.vehicle || (!isEmployer && !isReviewOwner)) {
      return res.status(403).json({ message: 'Access denied.' });
    }
    const { vehicle, employeeId, ...updateData } = req.body;
    const updated = await VehicleReview.findByIdAndUpdate(reviewId, updateData, { new: true, runValidators: true })
      .populate('vehicle', 'name wofRego')
      .populate('employeeId', 'name');
    if (!updated) {
      return res.status(404).json({ message: 'Review not found for update' });
    }
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: 'Failed to update review' });
  }
};

// Delete a vehicle review by its ID
export const deleteReview = async (req, res) => {
  try {
    const { reviewId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(reviewId)) {
      return res.status(400).json({ message: 'Invalid review ID format.' });
    }
    const review = await VehicleReview.findById(reviewId).populate('vehicle').populate('employeeId');
    let employee = null;
    if (req.user.role === 'employee') {
      employee = await Employee.findOne({ userId: req.user.id }).select('_id');
      if (!employee) {
        return res.status(403).json({ message: "Access denied." });
      }
    }
    const isEmployer = review && review.vehicle && review.vehicle.employerId && review.vehicle.employerId.toString() === req.user.id.toString();
    const isReviewOwner = req.user.role === 'employee' && review && review.employeeId && review.employeeId._id.toString() === employee?._id.toString();
    if (!review || !review.vehicle || (!isEmployer && !isReviewOwner)) {
      return res.status(403).json({ message: 'Access denied.' });
    }
    const deleted = await VehicleReview.findByIdAndDelete(reviewId);
    if (!deleted) {
      return res.status(404).json({ message: 'Review not found for deletion' });
    }
    res.status(200).json({ message: 'Review deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete review' });
  }
};

// --- Report Generation ---

// Helper: generate filename for reports
const generateReviewFilename = (review, extension) => {
  const vehicleName = review.vehicle?.name?.replace(/\s+/g, '_') || 'UnknownVehicle';
  const employeeName = review.employeeId?.name?.replace(/\s+/g, '_') || 'UnknownEmployee';
  const reviewDate = review.dateReviewed ? new Date(review.dateReviewed).toISOString().split('T')[0] : 'UnknownDate';
  return `Review_${vehicleName}_${employeeName}_${reviewDate}.${extension}`;
};

// Download a single vehicle review report (PDF or Excel)
export const downloadReviewReport = async (req, res) => {
  const { reviewId } = req.params;
  const { format = 'pdf' } = req.query;
  if (!['pdf', 'excel'].includes(format)) {
    return res.status(400).json({ message: 'Invalid format. Use "pdf" or "excel".' });
  }
  try {
    const review = await VehicleReview.findById(reviewId)
      .populate('vehicle', 'name wofRego employerId')
      .populate('employeeId', 'name');
    if (!review || !review.vehicle || !review.vehicle.employerId || review.vehicle.employerId.toString() !== req.user.id.toString()) {
      return res.status(404).json({ message: 'Review not found' });
    }
    const filename = generateReviewFilename(review, format === 'pdf' ? 'pdf' : 'xlsx');
    if (format === 'pdf') {
      const doc = new PDFDocument({ margin: 50 });
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
      doc.pipe(res);
      doc.fontSize(16).font('Helvetica-Bold').text('Vehicle Review Report', { align: 'center' });
      doc.moveDown(2);
      doc.fontSize(12).font('Helvetica-Bold');
      doc.text(`Vehicle: `, { continued: true }).font('Helvetica').text(`${review.vehicle?.name || 'N/A'}`);
      doc.text(`WOF/Rego: `, { continued: true }).font('Helvetica').text(`${review.vehicle?.wofRego || 'N/A'}`);
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
    } else {
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
      worksheet.eachRow({ includeEmpty: false }, function(row, rowNumber) {
        if (rowNumber > 3) {
          row.getCell('B').alignment = { wrapText: true, vertical: 'top' };
        }
      });
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
      const buffer = await workbook.xlsx.writeBuffer();
      res.send(buffer);
    }
  } catch (error) {
    if (!res.headersSent) {
      res.status(500).json({ message: 'Internal server error generating report' });
    } else {
      res.end();
    }
  }
};

// Send a single vehicle review report via email
export const sendReviewReportByClient = async (req, res) => {
  const { reviewId } = req.params;
  let { email, format = 'pdf' } = req.body;
  if (!email) {
    return res.status(400).json({ message: 'Email address is required.' });
  }
  if (!['pdf', 'excel'].includes(format)) {
    return res.status(400).json({ message: 'Invalid format specified. Use "pdf" or "excel".' });
  }
  try {
    const review = await VehicleReview.findById(reviewId)
      .populate('vehicle', 'name wofRego employerId')
      .populate('employeeId', 'name');
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
        doc.fontSize(16).font('Helvetica-Bold').text('Vehicle Review Report', { align: 'center' });
        doc.moveDown(2);
        doc.fontSize(12).font('Helvetica-Bold');
        doc.text(`Vehicle: `, { continued: true }).font('Helvetica').text(`${review.vehicle?.name || 'N/A'}`);
        doc.text(`WOF/Rego: `, { continued: true }).font('Helvetica').text(`${review.vehicle?.wofRego || 'N/A'}`);
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
    } else {
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
      worksheet.getCell('B9').alignment = { wrapText: true, vertical: 'top' };
      buffer = await workbook.xlsx.writeBuffer();
    }
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
    await transporter.sendMail({
      from: `"Vehicle Manager" <${process.env.EMAIL_USER}>`,
      to: email,
      subject,
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
    res.status(500).json({ message: `Failed to send review report via email: ${error.message}` });
  }
};

// Download a multi-review report for a specific vehicle (Excel only)
export const downloadVehicleReport = async (req, res) => {
  try {
    const { vehicleId } = req.params;
    const { startDate, endDate } = req.query;
    if (!vehicleId) {
      return res.status(400).json({ message: 'Vehicle ID is required.' });
    }
    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;
    if (start && isNaN(start.getTime())) {
      return res.status(400).json({ message: 'Invalid start date format.' });
    }
    if (end && isNaN(end.getTime())) {
      return res.status(400).json({ message: 'Invalid end date format.' });
    }
    if (end) end.setHours(23, 59, 59, 999);
    const vehicle = await Vehicle.findOne({ _id: vehicleId, employerId: req.user.id }).lean();
    if (!vehicle) {
      return res.status(404).json({ message: 'Vehicle not found or not associated with this employer.' });
    }
    const reviewQuery = { vehicle: vehicleId };
    if (start || end) {
      reviewQuery.dateReviewed = {};
      if (start) reviewQuery.dateReviewed.$gte = start;
      if (end) reviewQuery.dateReviewed.$lte = end;
    }
    const reviews = await VehicleReview.find(reviewQuery)
      .populate('employeeId', 'name')
      .sort({ dateReviewed: -1 });
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Vehicle Management System';
    workbook.created = new Date();
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
      vehicle.wofRego || 'N/A',
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
    if (reviews.length === 0) {
      historySheet.mergeCells('A2:G2');
      historySheet.getCell('A2').value = 'No reviews found for this vehicle in the specified date range.';
      historySheet.getCell('A2').alignment = { horizontal: 'center' };
      historySheet.getCell('A2').font = { italic: true };
    } else {
      reviews.forEach((r) => {
        historySheet.addRow({
          date: r.dateReviewed ? new Date(r.dateReviewed).toLocaleDateString() : 'N/A',
          employee: r.employeeId?.name || 'N/A',
          hours: r.hours ?? 'N/A',
          oilChecked: r.oilChecked ? 'Yes' : 'No',
          vehicleChecked: r.vehicleChecked ? 'Yes' : 'No',
          vehicleBroken: r.vehicleBroken ? 'Yes' : 'No',
          notes: r.notes || '',
        });
      });
      historySheet.getColumn('notes').alignment = { wrapText: true, vertical: 'top' };
    }
    const filename = `${vehicle.name.replace(/\s+/g, '_')}_Report_${startDate ? startDate : 'Start'}_to_${endDate ? endDate : 'End'}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    if (!res.headersSent) {
      res.status(500).json({ message: 'Error generating vehicle Excel report' });
    } else {
      res.end();
    }
  }
};

// Send a multi-review report for a specific vehicle via email (Excel only)
export const sendVehicleReportByEmail = async (req, res) => {
  try {
    const { vehicleId } = req.params;
    const { startDate, endDate, email } = req.body;
    if (!vehicleId || !email) {
      return res.status(400).json({ message: "Vehicle ID and Email are required." });
    }
    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;
    if (start && isNaN(start.getTime())) return res.status(400).json({ error: 'Invalid start date format.' });
    if (end && isNaN(end.getTime())) return res.status(400).json({ error: 'Invalid end date format.' });
    if (end) end.setHours(23, 59, 59, 999);
    const formattedStart = start ? start.toLocaleDateString() : 'Start';
    const formattedEnd = end ? end.toLocaleDateString() : 'End';
    const vehicle = await Vehicle.findOne({ _id: vehicleId, employerId: req.user.id }).lean();
    if (!vehicle) {
      return res.status(404).json({ message: 'Vehicle not found or not associated with this employer.' });
    }
    const reviewQuery = { vehicle: vehicleId };
    if (start || end) {
      reviewQuery.dateReviewed = {};
      if (start) reviewQuery.dateReviewed.$gte = start;
      if (end) reviewQuery.dateReviewed.$lte = end;
    }
    const reviews = await VehicleReview.find(reviewQuery)
      .populate('employeeId', 'name')
      .sort({ dateReviewed: -1 });
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Vehicle Management System';
    workbook.created = new Date();
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
      vehicle.wofRego || 'N/A',
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
        hours: r.hours ?? 'N/A',
        oilChecked: r.oilChecked ? 'Yes' : 'No',
        vehicleChecked: r.vehicleChecked ? 'Yes' : 'No',
        vehicleBroken: r.vehicleBroken ? 'Yes' : 'No',
        notes: r.notes || '',
      });
    });
    historySheet.getColumn('notes').alignment = { wrapText: true, vertical: 'top' };
    const buffer = await workbook.xlsx.writeBuffer();
    const filename = `${vehicle.name.replace(/\s+/g, '_')}_Report_${formattedStart}_to_${formattedEnd}.xlsx`;
    const transporter = nodemailer.createTransport({
      service: 'gmail',
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
    res.status(500).json({ message: `Failed to send review report via email: ${error.message}` });
  }
};

// --- Aggregate Reports ---

// Download a report for ALL vehicles (Excel only)
export const downloadAllVehiclesReport = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;
    if (start && isNaN(start.getTime())) return res.status(400).json({ message: 'Invalid start date format.' });
    if (end && isNaN(end.getTime())) return res.status(400).json({ message: 'Invalid end date format.' });
    if (end) end.setHours(23, 59, 59, 999);
    const vehicles = await Vehicle.find({ employerId: req.user.id }).lean();
    if (!vehicles || vehicles.length === 0) {
      return res.status(404).json({ message: 'No vehicles found in the system.' });
    }
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Vehicle Management System';
    workbook.created = new Date();
    const mainSheet = workbook.addWorksheet('All Vehicles Report');
    const columns = [
      { header: 'Vehicle Name', key: 'vehicleName', width: 25 },
      { header: 'Current Hours', key: 'hours', width: 15 },
      { header: 'WOF/Rego Due', key: 'wofRego', width: 15 },
    ];
    mainSheet.columns = columns;
    mainSheet.getRow(1).font = { bold: true, name: 'Calibri' };
    mainSheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };
    for (const vehicle of vehicles) {
      mainSheet.addRow({
        vehicleName: vehicle.name || 'N/A',
        hours: vehicle.hours ?? 'N/A',
        wofRego: vehicle.wofRego || 'N/A',
      });
    }
    mainSheet.getRow(1).eachCell(cell => {
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.font = { bold: true };
    });
    const formattedStart = start ? start.toISOString().split('T')[0] : 'Start';
    const formattedEnd = end ? end.toISOString().split('T')[0] : 'End';
    const filename = `All_Vehicles_Report_${formattedStart}_to_${formattedEnd}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    if (!res.headersSent) {
      res.status(500).json({ message: 'Internal server error generating all vehicles report' });
    } else {
      res.end();
    }
  }
};

// Send a report for ALL vehicles via email (Excel only)
export const sendAllVehiclesReportByEmail = async (req, res) => {
  try {
    const { startDate, endDate, email } = req.body;
    if (!email) {
      return res.status(400).json({ message: 'Recipient email address is required' });
    }
    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;
    if (start && isNaN(start.getTime())) return res.status(400).json({ error: 'Invalid start date format.' });
    if (end && isNaN(end.getTime())) return res.status(400).json({ error: 'Invalid end date format.' });
    if (end) end.setHours(23, 59, 59, 999);
    const formattedStart = start ? start.toLocaleDateString() : 'Start';
    const formattedEnd = end ? end.toLocaleDateString() : 'End';
    const vehicles = await Vehicle.find({ employerId: req.user.id }).lean();
    if (!vehicles || vehicles.length === 0) {
      return res.status(404).json({ message: 'No vehicles found. Email not sent.' });
    }
    const columns = [
      { header: 'Vehicle Name', key: 'vehicleName', width: 25 },
      { header: 'Current Hours', key: 'hours', width: 15 },
      { header: 'WOF/Rego Due', key: 'wofRego', width: 15 },
    ];
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Vehicle Management System';
    workbook.created = new Date();
    const mainSheet = workbook.addWorksheet('All Vehicles Report');
    mainSheet.columns = columns;
    mainSheet.getRow(1).font = { bold: true, name: 'Calibri' };
    mainSheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };
    for (const vehicle of vehicles) {
      mainSheet.addRow({
        vehicleName: vehicle.name || 'N/A',
        hours: vehicle.hours ?? 'N/A',
        wofRego: vehicle.wofRego || 'N/A',
      });
    }
    mainSheet.getRow(1).eachCell(cell => {
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.font = { bold: true };
    });
    const buffer = await workbook.xlsx.writeBuffer();
    const filename = `All_Vehicles_Report_${formattedStart}_to_${formattedEnd}.xlsx`;
    const transporter = nodemailer.createTransport({
      service: 'gmail',
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
    res.status(500).json({ message: `Failed to send all vehicles report email. ${error.message}` });
  }
};
