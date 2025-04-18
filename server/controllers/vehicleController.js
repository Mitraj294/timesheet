
import PDFDocument from 'pdfkit';
import ExcelJS from 'exceljs';
import nodemailer from 'nodemailer';
import Vehicle from '../models/Vehicle.js';
import VehicleReview from '../models/VehicleReview.js';
import Employee from '../models/Employee.js';


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

// Vehicle Review Routes
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
// Get all reviews for a specific vehicle by its ID
export const getVehicleReviewsByVehicleId = async (req, res) => {
  try {
    const { vehicleId } = req.params;

    const vehicle = await Vehicle.findById(vehicleId);
    if (!vehicle) {
      return res.status(404).json({ message: 'Vehicle not found' });
    }

    const reviews = await VehicleReview.find({ vehicle: vehicleId })
      .populate('vehicle', 'name wofRego')
      .populate('employeeId', 'name');

    res.status(200).json({ vehicle, reviews });
  } catch (err) {
    console.error('Error fetching reviews for vehicle:', err);
    res.status(500).json({ message: 'Server error while fetching vehicle reviews' });
  }
};

// Get a single vehicle review by reviewId
export const getReviewById = async (req, res) => {
  try {
    const review = await VehicleReview.findById(req.params.reviewId)
      .populate('vehicle', 'name wofRego')
      .populate('employeeId', 'name');

    if (!review) return res.status(404).json({ message: 'Review not found' });

    res.status(200).json(review);
  } catch (err) {
    console.error('Error fetching review by ID:', err);
    res.status(500).json({ message: 'Failed to fetch review' });
  }
};


// Get vehicle with its reviews will give both vehicle and review
export const getVehicleWithReviews = async (req, res) => {
  try {
    const { vehicleId } = req.params;

    const vehicle = await Vehicle.findById(vehicleId);
    if (!vehicle) {
      return res.status(404).json({ message: 'Vehicle not found' });
    }

    const reviews = await VehicleReview.find({ vehicle: vehicleId })
      .populate('vehicle', 'name wofRego')
      .populate('employeeId', 'name');

    res.status(200).json({ vehicle, reviews });
  } catch (err) {
    console.error('Error fetching vehicle with reviews:', err);
    res.status(500).json({ message: 'Server error while fetching vehicle and reviews' });
  }
};

// Update a review
export const updateReview = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const updated = await VehicleReview.findByIdAndUpdate(reviewId, req.body, { new: true });
    if (!updated) {
      return res.status(404).json({ error: 'Review not found' });
    }
    res.json(updated);
  } catch (err) {
    console.error('Error updating review:', err);
    res.status(500).json({ error: 'Failed to update review' });
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


export const downloadReviewReport = async (req, res) => {
  const { reviewId } = req.params;
  const { format } = req.query; // 'pdf' or 'excel'

  try {
    const review = await VehicleReview.findById(reviewId)
      .populate('vehicle', 'name wofRego')
      .populate('employeeId', 'name');

    if (!review) {
      return res.status(404).json({ error: 'Review not found' });
    }

    if (format === 'pdf') {
      const doc = new PDFDocument();
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=review_${reviewId}.pdf`);
      doc.pipe(res);

      // PDF Formatting
      doc.fontSize(16).font('Helvetica-Bold').text('Vehicle Review Report', { align: 'center' });
      doc.moveDown();

      doc.fontSize(12).font('Helvetica').text(`Vehicle: ${review.vehicle.name}`, { underline: true });
      doc.text(`WOF/Rego: ${review.vehicle.wofRego}`);
      doc.text(`Date Reviewed: ${new Date(review.dateReviewed).toLocaleDateString()}`);
      doc.text(`Employee: ${review.employeeId.name}`);
      doc.text(`Oil Checked: ${review.oilChecked ? 'Yes' : 'No'}`);
      doc.text(`Vehicle Checked: ${review.vehicleChecked ? 'Yes' : 'No'}`);
      doc.text(`Vehicle Broken: ${review.vehicleBroken ? 'Yes' : 'No'}`);
      doc.text(`Hours Used: ${review.hours}`);
      doc.text(`Notes: ${review.notes || 'N/A'}`);

      doc.end();
    } else if (format === 'excel') {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Review Report');

      worksheet.columns = [
        { header: 'Field', key: 'field', width: 25 },
        { header: 'Value', key: 'value', width: 50 },
      ];

      // Add rows with review data
      worksheet.addRows([
        { field: 'Vehicle', value: review.vehicle.name },
        { field: 'WOF/Rego', value: review.vehicle.wofRego },
        { field: 'Date Reviewed', value: new Date(review.dateReviewed).toLocaleDateString() },
        { field: 'Employee', value: review.employeeId.name },
        { field: 'Oil Checked', value: review.oilChecked ? 'Yes' : 'No' },
        { field: 'Vehicle Checked', value: review.vehicleChecked ? 'Yes' : 'No' },
        { field: 'Vehicle Broken', value: review.vehicleBroken ? 'Yes' : 'No' },
        { field: 'Hours Used', value: review.hours },
        { field: 'Notes', value: review.notes || 'N/A' },
      ]);

      // styles to Excel file
      worksheet.getRow(1).font = { bold: true };
      worksheet.getColumn(1).width = 30; 
      worksheet.getColumn(2).width = 50;

      // Send the Excel file to the client
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=review_${reviewId}.xlsx`);

      await workbook.xlsx.write(res);
      res.end();
    } else {
      res.status(400).json({ error: 'Invalid format. Use "pdf" or "excel".' });
    }
  } catch (error) {
    console.error('Error generating report:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};


export const sendReviewReportByClient = async (req, res) => {
  const { reviewId } = req.params;
  const { email, format = 'pdf' } = req.body;

  if (!email) {
    return res.status(400).json({ message: 'Email is required.' });
  }
  if (!['pdf', 'excel'].includes(format)) {
    return res.status(400).json({ message: 'Invalid format. Use "pdf" or "excel".' });
  }

  try {
    // Load the review, vehicle and employee data
    const review = await VehicleReview.findById(reviewId)
      .populate('vehicle', 'name wofRego')
      .populate('employeeId', 'name');
    if (!review) {
      return res.status(404).json({ message: 'Review not found.' });
    }

    let buffer;
    let filename;
    let contentType;

    if (format === 'pdf') {
      // Generate PDF into a Buffer
      buffer = await new Promise((resolve, reject) => {
        const doc = new PDFDocument({ autoFirstPage: true });
        const chunks = [];
        doc.on('data', (chunk) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        // PDF content
        doc.fontSize(16).font('Helvetica-Bold').text('Vehicle Review Report', { align: 'center' });
        doc.moveDown();
        doc.fontSize(12).font('Helvetica');
        doc.text(`Vehicle: ${review.vehicle.name}`);
        doc.text(`WOF/Rego: ${review.vehicle.wofRego}`);
        doc.text(`Date Reviewed: ${new Date(review.dateReviewed).toLocaleDateString()}`);
        doc.text(`Employee: ${review.employeeId.name}`);
        doc.text(`Oil Checked: ${review.oilChecked ? 'Yes' : 'No'}`);
        doc.text(`Vehicle Checked: ${review.vehicleChecked ? 'Yes' : 'No'}`);
        doc.text(`Vehicle Broken: ${review.vehicleBroken ? 'Yes' : 'No'}`);
        doc.text(`Hours Used: ${review.hours}`);
        doc.text(`Notes: ${review.notes || 'N/A'}`);

        doc.end();
      });

      filename = `review_${reviewId}.pdf`;
      contentType = 'application/pdf';
    } else {
      // Generate Excel into a Buffer
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('Review Report');

      sheet.columns = [
        { header: 'Field',          key: 'field', width: 30 },
        { header: 'Value',          key: 'value', width: 50 },
      ];
      sheet.addRows([
        { field: 'Vehicle',        value: review.vehicle.name },
        { field: 'WOF/Rego',       value: review.vehicle.wofRego },
        { field: 'Date Reviewed',  value: new Date(review.dateReviewed).toLocaleDateString() },
        { field: 'Employee',       value: review.employeeId.name },
        { field: 'Oil Checked',    value: review.oilChecked ? 'Yes' : 'No' },
        { field: 'Vehicle Checked',value: review.vehicleChecked ? 'Yes' : 'No' },
        { field: 'Vehicle Broken', value: review.vehicleBroken ? 'Yes' : 'No' },
        { field: 'Hours Used',     value: review.hours },
        { field: 'Notes',          value: review.notes || 'N/A' },
      ]);
      // styling
      sheet.getRow(1).font = { bold: true };
      sheet.getColumn(1).width = 30;
      sheet.getColumn(2).width = 50;

      buffer = await workbook.xlsx.writeBuffer();
      filename = `review_${reviewId}.xlsx`;
      contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    }

    // Send email with attachment
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: `Review Report: ${review.vehicle.name}`,
      text: `Please find attached the ${format.toUpperCase()} review report for ${review.vehicle.name}.`,
      attachments: [
        {
          filename,
          content: buffer,
          contentType,
        },
      ],
    });

    res.status(200).json({ message: 'Review report sent successfully.' });
  } catch (error) {
    console.error('Error sending review report:', error);
    res.status(500).json({ message: 'Failed to send review report.' });
  }
};


export const downloadVehicleReport = async (req, res) => {
  
  try {
    const vehicleId = req.params.vehicleId;
    const { startDate, endDate } = req.query;

    const vehicle = await Vehicle.findById(vehicleId);
    if (!vehicle) return res.status(404).json({ message: 'Vehicle not found' });

    // Parse dates
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999); // Include entire end day

    // Get reviews in date range
    const reviews = await VehicleReview.find({
      vehicle: vehicleId,
      dateReviewed: { $gte: start, $lte: end },
    }).populate('employeeId');

    const workbook = new ExcelJS.Workbook();

    //Sheet 1: Vehicle Summary
    const summarySheet = workbook.addWorksheet('Vehicle Summary');
    summarySheet.mergeCells('A1:C1');
    summarySheet.getCell('A1').value = 'Vehicle Summary Report';
    summarySheet.getCell('A1').font = { bold: true, size: 16 };
    summarySheet.getCell('A1').alignment = { horizontal: 'center' };

    summarySheet.addRow([]);
    summarySheet.addRow(['Vehicle Name', 'Total Hours', 'WOF/Rego']);
    summarySheet.addRow([
      vehicle.name || 'N/A',
      vehicle.hours || 'N/A',
      vehicle.wofRego || 'N/A',
    ]);
    summarySheet.getRow(3).font = { bold: true };

    //Sheet 2: Review History
    const historySheet = workbook.addWorksheet('Vehicle History');
    historySheet.columns = [
      { header: 'Employee Name', key: 'employee', width: 25 },
      { header: 'Date Reviewed', key: 'date', width: 15 },
      { header: 'WOF/Rego', key: 'wofRego', width: 15 },
      { header: 'Hours Used', key: 'hours', width: 10 },
      { header: 'Oil Checked', key: 'oilChecked', width: 15 },
      { header: 'Vehicle Checked', key: 'vehicleChecked', width: 20 },
      { header: 'Vehicle Broken', key: 'vehicleBroken', width: 20 },
      { header: 'Photos', key: 'photos', width: 30 },
      { header: 'Notes', key: 'notes', width: 30 },
    ];
    historySheet.getRow(1).font = { bold: true };

    if (reviews.length === 0) {
      historySheet.addRow({ employee: 'No reviews found for this date range.' });
    } else {
      reviews.forEach((r) => {
        historySheet.addRow({
          employee: r.employeeId?.name || 'N/A',
          date: r.dateReviewed ? new Date(r.dateReviewed).toLocaleDateString() : 'N/A',
          wofRego: vehicle.wofRego || 'N/A',
          hours: r.hours || 'N/A',
          oilChecked: r.oilChecked ? 'Yes' : 'No',
          vehicleChecked: r.vehicleChecked ? 'Yes' : 'No',
          vehicleBroken: r.vehicleBroken ? 'Yes' : 'No',
          photos: Array.isArray(r.photos) ? r.photos.join(', ') : (r.photos || 'N/A'),
          notes: r.notes || 'N/A',
        });
      });
    }

    res.setHeader(
      'Content-Disposition',
      `attachment; filename=${vehicle.name.replace(/\s+/g, '_')}_report.xlsx`
    );
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error('Error generating Excel:', err);
    res.status(500).json({ message: 'Error generating Excel report' });
  }
};


export const sendVehicleReportByEmail = async (req, res) => {
  try {
    const { vehicleId } = req.params;
    const { startDate, endDate, email } = req.body;

    if (!startDate || !endDate || !email) {
      return res.status(400).json({ message: "Missing required fields." });
    }

    const vehicle = await Vehicle.findById(vehicleId);
    if (!vehicle) return res.status(404).json({ message: 'Vehicle not found' });

    const reviews = await VehicleReview.find({
      vehicle: vehicleId,
      dateReviewed: {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      },
    }).populate('employeeId');

    if (!reviews.length) {
      return res.status(404).json({ message: 'No reviews in the selected range' });
    }

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Vehicle Report');

    worksheet.columns = [
      { header: 'Date', key: 'date', width: 15 },
      { header: 'Employee', key: 'employee', width: 25 },
      { header: 'WOF/Rego', key: 'wofRego', width: 15 },
      { header: 'Oil Checked', key: 'oilChecked', width: 15 },
      { header: 'Vehicle Checked', key: 'vehicleChecked', width: 15 },
      { header: 'Vehicle Broken', key: 'vehicleBroken', width: 15 },
      { header: 'Hours', key: 'hours', width: 10 },
    ];

    reviews.forEach((review) => {
      worksheet.addRow({
        date: review.dateReviewed.toISOString().split('T')[0],
        employee: review.employeeId?.name || 'Unknown',
        wofRego: vehicle.wofRego || 'N/A',
        oilChecked: review.oilChecked ? 'Yes' : 'No',
        vehicleChecked: review.vehicleChecked ? 'Yes' : 'No',
        vehicleBroken: review.vehicleBroken ? 'Yes' : 'No',
        hours: review.hours || 'N/A',
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: `Vehicle Report: ${vehicle.name}`,
      text: `Attached is the vehicle report for ${vehicle.name} from ${startDate} to ${endDate}.`,
      attachments: [
        {
          filename: `${vehicle.name}_report.xlsx`,
          content: buffer,
        },
      ],
    };

    await transporter.sendMail(mailOptions);
    res.status(200).json({ message: 'Vehicle report sent successfully.' });

  } catch (error) {
    console.error('Email report error:', error);
    res.status(500).json({ message: 'Failed to send email report.' });
  }
};


export const downloadAllVehiclesReport = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;

    const vehicles = await Vehicle.find().lean();
    if (!vehicles || vehicles.length === 0) {
      return res.status(404).json({ message: 'No vehicles found' });
    }

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('All Vehicles Report');

    for (const vehicle of vehicles) {
      // Vehicle Summary Header
      worksheet.addRow(['Vehicle Name', 'Hours', 'WOF/Rego']);
      worksheet.addRow([vehicle.name, vehicle.hours || 0, vehicle.wofRego || 'N/A']);

      worksheet.addRow([]);
      worksheet.addRow([
        'Employee Name', 'Date Reviewed', 'WOF/Rego', 'Hours Used',
        'Oil Checked', 'Vehicle Checked', 'Vehicle Broken', 'Notes'
      ]);

      // Date range filter
      const dateFilter = {
        vehicle: vehicle._id,
      };
      if (start && end) {
        dateFilter.dateReviewed = { $gte: start, $lte: end };
      } else if (start) {
        dateFilter.dateReviewed = { $gte: start };
      } else if (end) {
        dateFilter.dateReviewed = { $lte: end };
      }

      const reviews = await VehicleReview.find(dateFilter)
        .sort({ dateReviewed: -1 })
        .populate('employeeId', 'name')
        .lean();

      reviews.forEach((review) => {
        worksheet.addRow([
          review.employeeId?.name || 'N/A',
          review.dateReviewed?.toISOString().split('T')[0] || 'N/A',
          vehicle.wofRego || 'N/A',
          review.hoursUsed ?? 0,
          review.oilChecked ? 'Yes' : 'No',
          review.vehicleChecked ? 'Yes' : 'No',
          review.vehicleBroken ? 'Yes' : 'No',
          review.notes || ''
        ]);
      });

      worksheet.addRow([]);
      worksheet.addRow([]);
    }

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename=AllVehiclesReport.xlsx'
    );

    await workbook.xlsx.write(res);
    res.status(200).end();
  } catch (error) {
    console.error('Error downloading all vehicles report:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};


export const sendAllVehiclesReportByEmail = async (req, res) => {
  try {
    const { startDate, endDate, email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;

    const formattedStart = start ? start.toISOString().split('T')[0] : 'Start';
    const formattedEnd = end ? end.toISOString().split('T')[0] : 'Today';

    // Fetch all vehicles
    const vehicles = await Vehicle.find().lean();
    if (!vehicles || vehicles.length === 0) {
      return res.status(404).json({ message: 'No vehicles found' });
    }

    // Create a new Excel workbook and worksheet
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('All Vehicles Report');

    for (const vehicle of vehicles) {
      // Vehicle Header
      worksheet.addRow(['Vehicle Name', 'Total Hours', 'WOF/Rego']);
      worksheet.addRow([
        vehicle.name || 'Unnamed',
        vehicle.hours ?? 0,
        vehicle.wofRego || 'N/A',
      ]);
      worksheet.addRow([]);

      // Table headers
      worksheet.addRow([
        'Employee Name',
        'Date Reviewed',
        'WOF/Rego',
        'Hours Used',
        'Oil Checked',
        'Vehicle Checked',
        'Vehicle Broken',
        'Notes',
      ]);

      // Build review query
      const reviewQuery = { vehicle: vehicle._id };
      if (start && end) {
        reviewQuery.dateReviewed = { $gte: start, $lte: end };
      } else if (start) {
        reviewQuery.dateReviewed = { $gte: start };
      } else if (end) {
        reviewQuery.dateReviewed = { $lte: end };
      }

      // Get reviews for this vehicle
      const reviews = await VehicleReview.find(reviewQuery)
        .sort({ dateReviewed: -1 })
        .populate('employeeId', 'name')
        .lean();

      // Add review rows
      reviews.forEach((review) => {
        worksheet.addRow([
          review.employeeId?.name || 'N/A',
          review.dateReviewed ? review.dateReviewed.toISOString().split('T')[0] : 'N/A',
          vehicle.wofRego || 'N/A',
          review.hoursUsed ?? 0,
          review.oilChecked ? 'Yes' : 'No',
          review.vehicleChecked ? 'Yes' : 'No',
          review.vehicleBroken ? 'Yes' : 'No',
          review.notes || '',
        ]);
      });

      // Add spacing after each vehicle
      worksheet.addRow([]);
      worksheet.addRow([]);
    }

    // Write workbook to buffer
    const buffer = await workbook.xlsx.writeBuffer();

    // Set up Nodemailer transporter
    const transporter = nodemailer.createTransport({
      service: 'Gmail', 
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    // Send email with attachment
    await transporter.sendMail({
      from: `"Timesheet Manager" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: `All Vehicles Report (${formattedStart} to ${formattedEnd})`,
      text: `Hello,\n\nAttached is the vehicle report from ${formattedStart} to ${formattedEnd}.\n\nRegards,\ Team`,
      attachments: [
        {
          filename: `AllVehiclesReport_${formattedStart}_to_${formattedEnd}.xlsx`,
          content: buffer,
          contentType:
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        },
      ],
    });

    res.status(200).json({ message: 'Report sent successfully!' });
  } catch (error) {
    console.error('Error sending vehicle report:', error);
    res.status(500).json({ message: 'Failed to send report.', error: error.message });
  }
};