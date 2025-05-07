import PDFDocument from 'pdfkit';
import ExcelJS from 'exceljs';
import nodemailer from 'nodemailer';
import Vehicle from '../models/Vehicle.js';
import VehicleReview from '../models/VehicleReview.js';
import Employee from '../models/Employee.js';


// @desc    Get all vehicles
// @route   GET /api/vehicles
// @access  Private (e.g., Authenticated users)
export const getVehicles = async (req, res) => {
  try {
    const vehicles = await Vehicle.find().sort({ createdAt: -1 });
    res.json(vehicles);
  } catch (err) {
    console.error('Error fetching vehicles:', err);
    res.status(500).json({ message: 'Failed to fetch vehicles' });
  }
};

// @desc    Get a single vehicle by ID
// @route   GET /api/vehicles/:id
// @access  Private (e.g., Authenticated users)
export const getVehicleById = async (req, res) => {
  try {
    const vehicle = await Vehicle.findById(req.params.id);
    if (!vehicle) return res.status(404).json({ message: 'Vehicle not found' });
    res.json(vehicle);
  } catch (err) {
    console.error('Error getting vehicle:', err);
    res.status(500).json({ message: 'Failed to get vehicle' });
  }
};

// @desc    Create a new vehicle
// @route   POST /api/vehicles
// @access  Private (e.g., Admin/Manager)
export const createVehicle = async (req, res) => {
  try {
    const { name, hours, wofRego } = req.body;

    // Basic validation
    if (!name) {
        return res.status(400).json({ message: 'Vehicle name is required' });
    }

    const vehicle = new Vehicle({
      name,
      hours,
      wofRego,
    });

    await vehicle.save();
    res.status(201).json(vehicle);
  } catch (err) {
    console.error('Error creating vehicle:', err);
    // Check for potential duplicate key errors if name should be unique
    if (err.code === 11000) {
         return res.status(409).json({ message: 'Vehicle name already exists' });
    }
    res.status(500).json({ message: 'Failed to create vehicle' });
  }
};

// @desc    Update a vehicle
// @route   PUT /api/vehicles/:id
// @access  Private (e.g., Admin/Manager)
export const updateVehicle = async (req, res) => {
  try {
    const updated = await Vehicle.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!updated) {        
        return res.status(404).json({ message: 'Vehicle not found' });
    }
    res.json(updated);
  } catch (err) {
    console.error('Error updating vehicle:', err);
    res.status(500).json({ message: 'Failed to update vehicle' });
  }
};

// @desc    Delete a vehicle
// @route   DELETE /api/vehicles/:id
// @access  Private (e.g., Admin/Manager)
export const deleteVehicle = async (req, res) => {
  try {
    const deletedVehicle = await Vehicle.findByIdAndDelete(req.params.id);
    if (!deletedVehicle) {
        return res.status(404).json({ message: 'Vehicle not found for deletion' });
    }
    // IMPORTANT: Decide on handling associated reviews.
    // Option 1: Delete associated reviews (uncomment if this is the desired behavior)
    // await VehicleReview.deleteMany({ vehicle: req.params.id });
    res.json({ message: 'Vehicle deleted successfully' });
  } catch (err) {
    console.error('Error deleting vehicle:', err);
    res.status(500).json({ message: 'Failed to delete vehicle' });
  }
};

// --- Vehicle Review Routes ---

// @desc    Create a new vehicle review
// @route   POST /api/vehicles/reviews
// @access  Private (e.g., Authenticated users, Employees)
export const createVehicleReview = async (req, res) => {
  try {
    const { vehicle, dateReviewed, employeeId, oilChecked, vehicleChecked, vehicleBroken, notes, hours } = req.body;

    // Validate required fields
    if (!vehicle || !dateReviewed || !employeeId) {
        return res.status(400).json({ message: 'Missing required review fields (vehicle, dateReviewed, employeeId)' });
    }

    // Check if referenced documents exist
    const [existingVehicle, existingEmployee] = await Promise.all([
        Vehicle.findById(vehicle),
        Employee.findById(employeeId)
    ]);

    if (!existingVehicle) {
      return res.status(404).json({ message: 'Vehicle not found for review' });
    }
    if (!existingEmployee) {
      return res.status(404).json({ message: 'Employee not found for review' });
    }

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

// @desc    Get all reviews for a specific vehicle by its ID
// @route   GET /api/vehicles/:vehicleId/reviews
// @access  Private (e.g., Authenticated users)
export const getVehicleReviewsByVehicleId = async (req, res) => {
  try {
    const { vehicleId } = req.params;

    // Validate if vehicle exists first
    const vehicle = await Vehicle.findById(vehicleId).select('name wofRego'); // Only select needed fields
    if (!vehicle) {
      return res.status(404).json({ message: 'Vehicle not found' });
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

// @desc    Get a single vehicle review by its ID
// @route   GET /api/vehicles/reviews/:reviewId
// @access  Private (e.g., Authenticated users)
export const getReviewById = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const review = await VehicleReview.findById(reviewId)
      .populate('vehicle', 'name wofRego')
      .populate('employeeId', 'name');

    if (!review) return res.status(404).json({ message: 'Review not found' });

    res.status(200).json(review);
  } catch (err) {
    console.error('Error fetching review by ID:', err); // Keep detailed server log
    res.status(500).json({ message: 'Failed to fetch review' }); // Client-facing error
  }
};


// @desc    Get a vehicle along with all its reviews
// @route   GET /api/vehicles/:vehicleId/with-reviews
// @access  Private (e.g., Authenticated users)
// TODO: This function is very similar to getVehicleReviewsByVehicleId. Evaluate if consolidation is possible or if distinct use cases justify both.
// One difference is this returns the full vehicle object, while getVehicleReviewsByVehicleId returns selected vehicle fields.
export const getVehicleWithReviews = async (req, res) => {
  try {
    const { vehicleId } = req.params;

    const vehicle = await Vehicle.findById(vehicleId);
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

// @desc    Update a vehicle review by its ID
// @route   PUT /api/vehicles/reviews/:reviewId
// @access  Private (e.g., Admin/Manager or original reviewer)
export const updateReview = async (req, res) => {
  try {
    const { reviewId } = req.params;
    // Exclude potentially sensitive or immutable fields from req.body if necessary
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


// @desc    Delete a vehicle review by its ID
// @route   DELETE /api/vehicles/reviews/:reviewId
// @access  Private (e.g., Admin/Manager or original reviewer)
export const deleteReview = async (req, res) => {
  try {
    const { reviewId } = req.params;

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
// @access  Private (e.g., Authenticated users)
export const downloadReviewReport = async (req, res) => {
  const { reviewId } = req.params;
  const { format = 'pdf' } = req.query; // Default to pdf

  if (!['pdf', 'excel'].includes(format)) {
      return res.status(400).json({ message: 'Invalid format. Use "pdf" or "excel".' });
  }

  try {
    const review = await VehicleReview.findById(reviewId)
      .populate('vehicle', 'name wofRego')
      .populate('employeeId', 'name');
    // TODO: REFACTOR_SINGLE_REVIEW_REPORT_GENERATION - Consider refactoring PDF and Excel generation into separate helper functions.

    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }

    const filename = generateReviewFilename(review, format === 'pdf' ? 'pdf' : 'xlsx');

    if (format === 'pdf') {
      const doc = new PDFDocument({ margin: 50 });
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
      doc.pipe(res);

      // PDF Formatting
      doc.fontSize(16).font('Helvetica-Bold').text('Vehicle Review Report', { align: 'center' });
      doc.moveDown(2);

      doc.fontSize(12).font('Helvetica-Bold');
      doc.text(`Vehicle: `, { continued: true }).font('Helvetica').text(`${review.vehicle?.name || 'N/A'}`);
      doc.text(`WOF/Rego: `, { continued: true }).font('Helvetica').text(`${review.vehicle?.wofRego || 'N/A'}`);
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
    // Avoid sending JSON response if headers might have been partially sent
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
// @access  Private (e.g., Authenticated users)
export const sendReviewReportByClient = async (req, res) => {
  const { reviewId } = req.params;
  let { email, format = 'pdf' } = req.body; // Default to pdf

  if (!email) {
    return res.status(400).json({ message: 'Email address is required.' });
  }
  if (format === 'excel') {
    // Note: This restriction was in the original code. If Excel is now supported, this check can be removed.
    return res.status(400).json({ message: 'Excel format is temporarily unavailable for sending single reviews. Please use PDF format for now.' });
  }
  format = 'pdf'; // Ensure only PDF is processed
  // TODO: REFACTOR_SINGLE_REVIEW_REPORT_GENERATION - Use the same refactored PDF generation helper as in downloadReviewReport.
  try {
    // Load the review, vehicle and employee data
    const review = await VehicleReview.findById(reviewId)
      .populate('vehicle', 'name wofRego')
      .populate('employeeId', 'name');
    if (!review) {
      return res.status(404).json({ message: 'Review not found.' });
    }

    let buffer;
    let filename = generateReviewFilename(review, 'pdf'); // Always PDF
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
    } // Excel logic is effectively removed by the check above

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
    res.status(500).json({ message: 'Failed to send review report via email.' });
  }
};

// @desc    Download a multi-review report for a specific vehicle (Excel only)
// @route   GET /api/vehicles/:vehicleId/report/download
// @access  Private (e.g., Authenticated users)
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

    const vehicle = await Vehicle.findById(vehicleId).lean(); // Use .lean() if not modifying
    if (!vehicle) return res.status(404).json({ message: 'Vehicle not found' });

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
      vehicle.wofRego ? new Date(vehicle.wofRego).toLocaleDateString() : 'N/A', // Format date if exists
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
// @access  Private (e.g., Authenticated users)
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

    const vehicle = await Vehicle.findById(vehicleId).lean();
    if (!vehicle) return res.status(404).json({ message: 'Vehicle not found' });

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
      vehicle.wofRego ? new Date(vehicle.wofRego).toLocaleDateString() : 'N/A',
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
        hours: r.hours ?? 'N/A',
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
    res.status(500).json({ message: 'Failed to send vehicle report email.' });
  }
};

// --- Aggregate Reports ---

// @desc    Download a report for ALL vehicles and their reviews (Excel only)
// @route   GET /api/vehicles/report/all/download
// @access  Private (e.g., Admin/Manager)
export const downloadAllVehiclesReport = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;
    if (start && isNaN(start.getTime())) return res.status(400).json({ message: 'Invalid start date format.' });
    if (end && isNaN(end.getTime())) return res.status(400).json({ message: 'Invalid end date format.' });
    if (end) end.setHours(23, 59, 59, 999);

    // Fetch all vehicles efficiently
    const vehicles = await Vehicle.find().lean();
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

    // Fetch all relevant reviews in one go
    const allReviews = await VehicleReview.find(reviewQueryBase)
        .sort({ vehicle: 1, dateReviewed: -1 }) // Sort by vehicle for easier grouping if needed, then by date
        .populate('employeeId', 'name')
        .lean();

    // Group reviews by vehicleId for easier access
    const reviewsByVehicleId = allReviews.reduce((acc, review) => {
        const vehicleIdString = review.vehicle.toString();
        if (!acc[vehicleIdString]) acc[vehicleIdString] = [];
        acc[vehicleIdString].push(review);
        return acc;
    }, {});

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Vehicle Management System';
    workbook.created = new Date();
    const mainSheet = workbook.addWorksheet('All Vehicles Report');

    // Define columns once for the main sheet
    const columns = [
        { header: 'Vehicle Name', key: 'vehicleName', width: 25 },
        { header: 'Date Reviewed', key: 'date', width: 15 },
        { header: 'Employee Name', key: 'employee', width: 25 },
        { header: 'Hours Recorded', key: 'hours', width: 15 },
        { header: 'Oil Checked', key: 'oilChecked', width: 15 },
        { header: 'Vehicle Checked', key: 'vehicleChecked', width: 18 },
        { header: 'Vehicle Broken', key: 'vehicleBroken', width: 18 },
        { header: 'Notes', key: 'notes', width: 40 },
        { header: 'Vehicle WOF/Rego', key: 'wofRego', width: 15 }, // Added WOF/Rego date
    ];
    mainSheet.columns = columns;
    mainSheet.getRow(1).font = { bold: true, name: 'Calibri' };
    mainSheet.getRow(1).alignment = { vertical: 'middle' };

    let hasReviews = false; // Flag to check if any reviews were found

    // Loop through vehicles and use pre-fetched reviews
    for (const vehicle of vehicles) {
      const reviewsForThisVehicle = reviewsByVehicleId[vehicle._id.toString()] || [];

      if (reviewsForThisVehicle.length > 0) {
          hasReviews = true;
          // Sort reviews for this specific vehicle by date again if needed, though already sorted globally
          reviewsForThisVehicle.sort((a, b) => new Date(b.dateReviewed) - new Date(a.dateReviewed));

          reviewsForThisVehicle.forEach((review) => {
            mainSheet.addRow({
              vehicleName: vehicle.name || 'N/A',
              date: review.dateReviewed ? new Date(review.dateReviewed).toLocaleDateString() : 'N/A',
              employee: review.employeeId?.name || 'N/A',
              hours: review.hours ?? 'N/A',
              oilChecked: review.oilChecked ? 'Yes' : 'No',
              vehicleChecked: review.vehicleChecked ? 'Yes' : 'No',
              vehicleBroken: review.vehicleBroken ? 'Yes' : 'No',
              notes: review.notes || '',
              wofRego: vehicle.wofRego ? new Date(vehicle.wofRego).toLocaleDateString() : 'N/A',
            });
          });
      }
    }
    // TODO: REFACTOR_EXCEL_ALL_VEHICLES - Consider refactoring the workbook generation into a helper function.
    // This helper would return an ExcelJS.Workbook instance.

    // Handle case where no reviews were found for any vehicle in the range
    if (!hasReviews) {
        mainSheet.mergeCells('A2:I2'); // Merge across all columns
        mainSheet.getCell('A2').value = 'No reviews found for any vehicle in the specified date range.';
        mainSheet.getCell('A2').alignment = { horizontal: 'center' };
        mainSheet.getCell('A2').font = { italic: true };
    } else {
         // Apply wrap text to notes column if there's data
         mainSheet.getColumn('notes').alignment = { wrapText: true, vertical: 'top' };
    }


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
// @access  Private (e.g., Admin/Manager)
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

    // Fetch all vehicles
    const vehicles = await Vehicle.find().lean();
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
        { header: 'Date Reviewed', key: 'date', width: 15 },
        { header: 'Employee Name', key: 'employee', width: 25 },
        { header: 'Hours Recorded', key: 'hours', width: 15 },
        { header: 'Oil Checked', key: 'oilChecked', width: 15 },
        { header: 'Vehicle Checked', key: 'vehicleChecked', width: 18 },
        { header: 'Vehicle Broken', key: 'vehicleBroken', width: 18 },
        { header: 'Notes', key: 'notes', width: 40 },
        { header: 'Vehicle WOF/Rego', key: 'wofRego', width: 15 },
    ];
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Vehicle Management System';
    workbook.created = new Date();
    const mainSheet = workbook.addWorksheet('All Vehicles Report');
    mainSheet.columns = columns;
    mainSheet.getRow(1).font = { bold: true, name: 'Calibri' };
    mainSheet.getRow(1).alignment = { vertical: 'middle' };

    let hasReviews = false;

    for (const vehicle of vehicles) {
      const reviews = reviewsByVehicleId[vehicle._id.toString()] || [];
      // Ensure reviews are sorted by date for this vehicle if the global sort wasn't sufficient for per-vehicle ordering
      reviews.sort((a, b) => new Date(b.dateReviewed) - new Date(a.dateReviewed));


      if (reviews.length > 0) {
          hasReviews = true;
          reviews.forEach((review) => {
            mainSheet.addRow({
              vehicleName: vehicle.name || 'N/A',
              date: review.dateReviewed ? new Date(review.dateReviewed).toLocaleDateString() : 'N/A',
              employee: review.employeeId?.name || 'N/A',
              hours: review.hours ?? 'N/A',
              oilChecked: review.oilChecked ? 'Yes' : 'No',
              vehicleChecked: review.vehicleChecked ? 'Yes' : 'No',
              vehicleBroken: review.vehicleBroken ? 'Yes' : 'No',
              notes: review.notes || '',
              wofRego: vehicle.wofRego ? new Date(vehicle.wofRego).toLocaleDateString() : 'N/A',
            });
          });
      }
    }

    if (!hasReviews) {
      return res.status(404).json({ message: 'No reviews found for any vehicle in the specified date range. Email not sent.' });
    }

    mainSheet.getColumn('notes').alignment = { wrapText: true, vertical: 'top' };

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
