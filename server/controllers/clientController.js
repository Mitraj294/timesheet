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
    // 1. Get all clients for the logged-in employer
    const employerClients = await Client.find({ employerId: req.user.id }).select('_id name');
    if (!employerClients.length) {
      return res.status(404).json({ message: 'No clients found for this employer to generate a report.' });
    }
    const employerClientIds = employerClients.map(client => client._id);

    // 2. Fetch timesheets only for those clients
    const timesheets = await Timesheet.find({ clientId: { $in: employerClientIds } })
      .populate('employeeId')
      .populate('projectId')
      .populate('clientId');

    if (!timesheets.length) {
      return res.status(404).json({ message: 'No timesheet data found to generate a report.' });
    }

    const dataMap = {};

    timesheets.forEach((ts) => {
      const clientId = ts.clientId?._id?.toString();
      const projectId = ts.projectId?._id?.toString();
      const employeeId = ts.employeeId?._id?.toString();

      // Skip if essential linked data is missing
      if (!clientId || !projectId || !employeeId) return;

      if (!dataMap[clientId]) {
        dataMap[clientId] = {
          name: ts.clientId.name,
          projects: {},
        };
      }

      if (!dataMap[clientId].projects[projectId]) {
        dataMap[clientId].projects[projectId] = {
          name: ts.projectId.name,
          employees: {},
        };
      }

      if (!dataMap[clientId].projects[projectId].employees[employeeId]) {
        dataMap[clientId].projects[projectId].employees[employeeId] = {
          name: ts.employeeId.name,
          timesheets: [],
        };
      }

      dataMap[clientId].projects[projectId].employees[employeeId].timesheets.push(ts);
    });

    // If dataMap is empty after processing (e.g., all timesheets lacked linked info)
    if (Object.keys(dataMap).length === 0) {
      return res.status(404).json({ message: 'No valid timesheet entries to build the report.' });
    }

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Clients Timesheets');

    worksheet.addRow([
      'Client',
      'Project',
      'Employee',
      'Date',
      'Day',
      'Start Time',
      'End Time',
      'Lunch Break',
      'Leave Type',
      'Hours',
      'Notes',
    ]);

    worksheet.columns = [
      { width: 20 },
      { width: 25 },
      { width: 25 },
      { width: 15 },
      { width: 15 },
      { width: 15 },
      { width: 15 },
      { width: 20 },
      { width: 15 },
      { width: 10 },
      { width: 30 },
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

    for (const clientId in dataMap) {
      const client = dataMap[clientId];
      worksheet.addRow([client.name]); // Client Header

      let clientTotalHours = 0;

      for (const projectId in client.projects) {
        const project = client.projects[projectId];
        worksheet.addRow(['', project.name]); // Project Header

        let projectTotalHours = 0;

        for (const employeeId in project.employees) {
          const employee = project.employees[employeeId];
          worksheet.addRow(['', '', employee.name]); // Employee Header

          employee.timesheets.forEach((ts) => {
            worksheet.addRow([
              '',
              '',
              '',
              formatDateOnly(ts.date),
              formatDayOnly(ts.date),
              formatTimeOnly(ts.startTime),
              formatTimeOnly(ts.endTime),
              ts.lunchBreak ? `Yes (${ts.lunchDuration || 0} min)` : 'No',
              ts.leaveType || '',
              ts.totalHours?.toFixed(2) || '',
              ts.notes || '',
            ]);

            projectTotalHours += ts.totalHours || 0;
            clientTotalHours += ts.totalHours || 0;
          });
        }

        worksheet.addRow(['', `${project.name} Total Hours:`, '', '', '', '', '', '', '', projectTotalHours.toFixed(2)]);
        worksheet.addRow([]);
      }

      worksheet.addRow([`${client.name} Total Hours:`, '', '', '', '', '', '', '', '', clientTotalHours.toFixed(2)]);
      worksheet.addRow([]);
    }

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=clients-timesheets.xlsx');

    await workbook.xlsx.write(res);
    res.end();

  } catch (error) {
    console.error('Excel download error:', error);
    res.status(500).json({ message: 'Failed to generate Excel file' });
  }
};