import ExcelJS from 'exceljs';
import { format } from 'date-fns'; 
import mongoose from 'mongoose'; // Import mongoose

import User from '../models/User.js'; // Import User model if not already
import Client from '../models/Client.js';
import Project from '../models/Project.js';
import Employee from '../models/Employee.js';
import Timesheet from '../models/Timesheet.js';

// @desc    Create a new client
// @route   POST /api/clients
// @access  Private (Employer Only)
export const createClient = async (req, res) => {
  try {
    const { name, emailAddress, phoneNumber, address, notes, isImportant } = req.body;

    if (!name || !emailAddress || !phoneNumber) {
      return res.status(400).json({ message: "Name, Email Address, and Phone Number are required." });
    }

    // Basic email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailAddress)) {
      return res.status(400).json({ message: "Name, Email, and Phone are required." });
    }

    // Check if client with the same name already exists for this employer
    const existingClientByName = await Client.findOne({ name, employerId: req.user.id });
    if (existingClientByName) {
      return res.status(409).json({ message: `A client named '${name}' already exists.` });
    }

    const newClient = new Client({
      name,
      emailAddress,
      phoneNumber,
      address,
      notes,
      isImportant,
      employerId: req.user.id // Associate with the logged-in employer
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
// @access  Private (Employer Only)
export const getClients = async (req, res) => {
  try {
    let targetEmployerId;

    if (req.user.role === 'employer') {
      targetEmployerId = req.user.id;
    } else if (req.user.role === 'employee') {
      // Find the employee record using their User ID to get their employer's ID
      const employeeRecord = await Employee.findOne({ userId: req.user.id }).select('employerId').lean();
      if (!employeeRecord || !employeeRecord.employerId) {
        // If employee has no employerId, they can't see any clients this way.
        return res.status(200).json([]); // Return empty array or appropriate error
      }
      targetEmployerId = employeeRecord.employerId;
    } else {
      // For any other roles, deny access or handle as per your app's logic
      return res.status(403).json({ message: "Access denied for this role." });
    }

    const clients = await Client.find({ employerId: targetEmployerId }).sort({ name: 1 });
    res.status(200).json(clients || []); // Ensure an array is always returned
  } catch (error) {
    console.error("Error fetching clients:", error);
    res.status(500).json({ message: "Error fetching clients" });
  }
};

// @desc    Fetch a single client by ID
// @route   GET /api/clients/:id
// @access  Private (Employer Only)
export const getClientById = async (req, res) => {
  try {
    const clientId = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(clientId)) {
      return res.status(400).json({ message: "Invalid Client ID format." });
    }

    let targetEmployerId;
    if (req.user.role === 'employer') {
      targetEmployerId = req.user.id;
    } else if (req.user.role === 'employee') {
      // Find the employee record to get their employer's ID
      const employeeRecord = await Employee.findOne({ userId: req.user.id }).select('employerId').lean();
      if (!employeeRecord || !employeeRecord.employerId) {
        return res.status(403).json({ message: "Access denied: Employee not linked to an employer." });
      }
      targetEmployerId = employeeRecord.employerId;
    } else {
      return res.status(403).json({ message: "Access denied for this role." });
    }
    const client = await Client.findOne({ _id: clientId, employerId: targetEmployerId });
    if (!client) { // Handles not found or not belonging to the determined employer
      return res.status(404).json({ message: "Client not found" });
    }
    res.status(200).json(client);
  } catch (error) {
    console.error("Error fetching client by ID:", error);
    if (error.kind === 'ObjectId' && error.path === '_id') { // More specific check for invalid ID format during query
        return res.status(404).json({ message: "Client not found (invalid ID format during query)." });
    }
    res.status(500).json({ message: "Server error while fetching client details." });
  }
};

// @desc    Update a client by ID
// @route   PUT /api/clients/:id
// @access  Private (Employer Only)
export const updateClient = async (req, res) => {
  try {
    const { name, emailAddress, phoneNumber, address, notes, isImportant } = req.body;

    // Basic email format validation (optional, but good for consistency)
    if (emailAddress) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(emailAddress)) {
        return res.status(400).json({ message: "Please provide a valid email address." });
      }
    }

    // Find the client ensuring it belongs to the logged-in employer
    let clientToUpdate = await Client.findOne({ _id: req.params.id, employerId: req.user.id });
    if (!clientToUpdate) {
      return res.status(404).json({ message: "Client not found or not associated with this employer." });
    }

    // If name is being changed, check for uniqueness within the employer's clients (excluding the current one)
    if (name && name !== clientToUpdate.name) {
        const existingClientByName = await Client.findOne({ name, employerId: req.user.id, _id: { $ne: req.params.id } });
        if (existingClientByName) {
          return res.status(409).json({ message: `Another client named '${name}' already exists.` });
        }
    }

    const updatedClient = await Client.findByIdAndUpdate(
      req.params.id,
      { name, emailAddress, phoneNumber, address, notes, isImportant },
      { new: true, runValidators: true }
    );

    res.status(200).json(updatedClient);
  } catch (error) {
    console.error("Error updating client:", error);
    res.status(500).json({ message: "Error updating client" });
  }
};

// @desc    Delete a client by ID
// @route   DELETE /api/clients/:id
// @access  Private (Employer Only)
export const deleteClient = async (req, res) => {
  try {
    const client = await Client.findOneAndDelete({ _id: req.params.id, employerId: req.user.id });
    if (!client) { // Handles both not found and not belonging to employer
      return res.status(404).json({ message: "Client not found" });
    }
    res.json({ message: "Client deleted successfully" });
  } catch (error) {
    console.error("Error deleting client:", error);
    res.status(500).json({ message: "Error deleting client" });
  }
};


// @desc    Fetch all projects for a specific client
// @route   GET /api/clients/:id/projects
// @access  Private (Employer Only)
export const getClientProjects = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate the client ID and ensure it belongs to the employer
    const client = await Client.findOne({ _id: id, employerId: req.user.id });
    if (!client) {
      return res.status(404).json({ message: "Client not found" });
    }

    // Fetch projects associated with the client
    const projects = await Project.find({ clientId: id });

    res.status(200).json(projects);
  } catch (error) {
    console.error("Error fetching projects:", error);
    res.status(500).json({ message: "Error fetching client projects" });
  }
};


// @desc    Download timesheet data grouped by clients, projects, and employees as an Excel file
// @route   GET /api/clients/download/excel  (Assuming a route, adjust if different)
// @access  Private (Employer Only)
export const downloadClients = async (req, res) => {
  try {
    const employerId = req.user.id;

    // 1. Get all clients for the logged-in employer
    const employerClients = await Client.find({ employerId }).select('_id name').lean();
    if (!employerClients.length) {
      return res.status(404).json({ message: 'No clients found for this employer to generate a report.' });
    }
    const employerClientIds = employerClients.map(client => client._id);

    // 2. Get all employees for the logged-in employer
    const employerEmployees = await Employee.find({ employerId }).select('_id name').lean();
    // No need to check if employerEmployees is empty here, as clients might exist without employees having timesheets yet.
    const employerEmployeeIds = employerEmployees.map(emp => emp._id);

    // 3. Fetch all projects for these clients
    const clientProjects = await Project.find({ clientId: { $in: employerClientIds } }).select('_id name clientId').lean();

    // 4. Fetch all relevant timesheets:
    // Timesheets for projects of the employer's clients, AND by employees of this employer.
    const relevantTimesheets = await Timesheet.find({
      clientId: { $in: employerClientIds }, // Timesheets for the employer's clients
      projectId: { $in: clientProjects.map(p => p._id) }, // Timesheets for projects of those clients
      employeeId: { $in: employerEmployeeIds } // Timesheets by employees of this employer
    })
    .populate('employeeId', 'name')
    .populate('projectId', 'name')
    .populate('clientId', 'name')
    .sort({ date: 1, startTime: 1 })
    .lean();

    // Group timesheets by clientId, then projectId, then employeeId for efficient lookup
    const timesheetsGrouped = relevantTimesheets.reduce((acc, ts) => {
        const clientIdStr = ts.clientId?._id?.toString();
        const projectIdStr = ts.projectId?._id?.toString();
        const employeeIdStr = ts.employeeId?._id?.toString();

        if (!clientIdStr || !projectIdStr || !employeeIdStr) return acc;

        acc[clientIdStr] = acc[clientIdStr] || {};
        acc[clientIdStr][projectIdStr] = acc[clientIdStr][projectIdStr] || {};
        acc[clientIdStr][projectIdStr][employeeIdStr] = acc[clientIdStr][projectIdStr][employeeIdStr] || [];
        acc[clientIdStr][projectIdStr][employeeIdStr].push(ts);
        return acc;
    }, {});

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Timesheet App";
    const worksheet = workbook.addWorksheet('Clients Timesheets');

    const headerRow = worksheet.addRow([
      'Client',
      'Project',
      'Employee',
      'Date',
      'Day',
      'Start Time',
      'End Time',
      'Lunch', // Shortened
      'Leave Type',
      'Hours',
      'Notes',
    ]);
    headerRow.font = { bold: true };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
    headerRow.fill = {
        type: 'pattern',
        pattern:'solid',
        fgColor:{argb:'FFD3D3D3'} // Light Gray
    };
    headerRow.border = { bottom: { style: 'thin' } };

    worksheet.columns = [
      { header: 'Client', key: 'clientNameCol', width: 25 },
      { header: 'Project', key: 'projectNameCol', width: 25 },
      { header: 'Employee', key: 'employeeNameCol', width: 25 },
      { header: 'Date', key: 'dateCol', width: 15, style: { numFmt: 'dd/mm/yyyy' } },
      { header: 'Day', key: 'dayCol', width: 15 },
      { header: 'Start Time', key: 'startTimeCol', width: 15 },
      { header: 'End Time', key: 'endTimeCol', width: 15 },
      { header: 'Lunch', key: 'lunchCol', width: 10 },
      { header: 'Leave Type', key: 'leaveTypeCol', width: 15 },
      { header: 'Hours', key: 'hoursCol', width: 10, style: { numFmt: '0.00' } },
      { header: 'Notes', key: 'notesCol', width: 30 }
    ];

    const formatTimeOnly = (isoString) => {
      // Handles cases where startTime or endTime might be null/undefined
      if (!isoString) return '';
      const date = new Date(isoString);
      return isNaN(date.getTime()) ? '' : format(date, 'hh:mm a'); // Format like "09:00 AM"
    };

    const formatDateOnly = (isoString) => {
      if (!isoString) return '';
      const date = new Date(isoString);
      return isNaN(date.getTime()) ? '' : format(date, 'dd/MM/yyyy'); // Format like "17/04/2025"
    };

    const formatDayOnly = (isoString) => {
      if (!isoString) return '';
      const date = new Date(isoString);
      // `format` with 'EEEE' gives full day name, e.g., "Monday"
      // Ensure date is valid before formatting
      return isNaN(date.getTime()) ? '' : format(date, 'EEEE');
    };

    employerClients.forEach(clientDoc => {
      const clientRow = worksheet.addRow([clientDoc.name]);
      clientRow.font = { bold: true, size: 14 };
      worksheet.mergeCells(clientRow.number, 1, clientRow.number, worksheet.columns.length);
      clientRow.getCell(1).alignment = { horizontal: 'left', vertical: 'middle' };
      let clientTotalHours = 0;

      const projectsForThisClient = clientProjects.filter(p => p.clientId.toString() === clientDoc._id.toString());

      if (projectsForThisClient.length === 0) {
        worksheet.addRow(['', 'No projects for this client.']);
      } else {
        projectsForThisClient.forEach(projectDoc => {
          const projectRow = worksheet.addRow(['', projectDoc.name]);
          projectRow.font = { bold: true, size: 12 };
          worksheet.mergeCells(projectRow.number, 2, projectRow.number, worksheet.columns.length);
          projectRow.getCell(2).alignment = { horizontal: 'left', vertical: 'middle' };
          let projectTotalHours = 0;

          let projectHasTimesheetsByEmployerEmployees = false;
          employerEmployees.forEach(employeeDoc => {
            const timesheetsForEmployeeProject = timesheetsGrouped[clientDoc._id.toString()]?.[projectDoc._id.toString()]?.[employeeDoc._id.toString()] || [];

            if (timesheetsForEmployeeProject.length > 0) {
              projectHasTimesheetsByEmployerEmployees = true;
              timesheetsForEmployeeProject.forEach((ts, index) => {
                worksheet.addRow([
                  '', // Client column blank
                  '', // Project column blank
                  index === 0 ? employeeDoc.name : '', // Employee name only on first entry for this employee/project
                  formatDateOnly(ts.date),
                  formatDayOnly(ts.date),
                  formatTimeOnly(ts.startTime),
                  formatTimeOnly(ts.endTime),
                  ts.lunchBreak === 'Yes' ? (ts.lunchDuration || '00:00') : '',
                  ts.leaveType === 'None' ? '' : (ts.leaveType || ''),
                  ts.totalHours?.toFixed(2) || '0.00',
                  ts.notes || '',
                ]);
                projectTotalHours += ts.totalHours || 0;
              });
            }
          });

          if (!projectHasTimesheetsByEmployerEmployees && employerEmployees.length > 0) {
            // If there are employees for this employer, but none logged time for this specific project
            worksheet.addRow(['', '', 'No timesheet entries for this project by your employees.']);
          } else if (employerEmployees.length === 0) {
            // If the employer has no employees at all
             worksheet.addRow(['', '', 'No employees assigned to this employer.']);
          }

          const projectTotalRow = worksheet.addRow(['', `Project: ${projectDoc.name} - Total Hours:`, '', '', '', '', '', '', '', projectTotalHours.toFixed(2)]);
          projectTotalRow.font = { bold: true };
          clientTotalHours += projectTotalHours;
          worksheet.addRow([]); // Spacer after project total
        });
      }

      // Client Total Hours Row
      const clientTotalLabel = `Client: ${clientDoc.name} - Total Hours:`;
      const clientTotalRow = worksheet.addRow([clientTotalLabel, '', '', '', '', '', '', '', '', clientTotalHours.toFixed(2)]);
      clientTotalRow.font = { bold: true }; // Just bold

      // Merge cells for the label to span from column A to I (1 to 9)
      worksheet.mergeCells(clientTotalRow.number, 1, clientTotalRow.number, 9); 
      clientTotalRow.getCell(1).alignment = { horizontal: 'left' }; // Align label to the right of merged cell
      // The value is in the 10th cell (key 'hoursCol' if using keys, or by index)
      clientTotalRow.getCell(10).alignment = { horizontal: 'left' }; // Align total hours value
      worksheet.addRow([]); // Spacer after client total
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    const filename = `Client_Timesheet_Report_${format(new Date(), 'yyyyMMdd_HHmmss')}.xlsx`;
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    await workbook.xlsx.write(res);
    res.end();

  } catch (error) {
    console.error('Excel download error:', error);
    if (!res.headersSent) { // Check if headers were already sent
        res.status(500).json({ message: `Failed to generate Excel file: ${error.message}` });
    } else {
        // If headers are sent, we can't send a JSON error, but we should log and end the response.
        console.error("Headers already sent, could not send JSON error response for Excel generation.");
        res.end();
    }
  }
};
