import ExcelJS from 'exceljs';
import { format } from 'date-fns'; 
import * as dateFnsTz from 'date-fns-tz';
const { utcToZonedTime, zonedTimeToUtc } = dateFnsTz;

import Client from '../models/Client.js';
import Project from '../models/Project.js';
import Employee from '../models/Employee.js';
import Timesheet from '../models/Timesheet.js';

// @desc    Create a new client
// @route   POST /api/clients
// @access  Public
export const createClient = async (req, res) => {
  try {
    const { name, emailAddress, phoneNumber, address, notes, isImportant } = req.body;

    if (!name || !emailAddress || !phoneNumber) {
      return res.status(400).json({ message: "Name, Email, and Phone are required." });
    }

    const newClient = new Client({
      name,
      emailAddress,
      phoneNumber,
      address,
      notes,
      isImportant,
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
// @access  Public
export const getClients = async (req, res) => {
  try {
    const clients = await Client.find();
    res.status(200).json(clients);
  } catch (error) {
    console.error("Error fetching clients:", error);
    res.status(500).json({ message: "Error fetching clients" });
  }
};

// @desc    Fetch a single client by ID
// @route   GET /api/clients/:id
// @access  Public
export const getClientById = async (req, res) => {
  try {
    const client = await Client.findById(req.params.id);
    if (!client) {
      return res.status(404).json({ message: "Client not found" });
    }
    res.status(200).json(client);
  } catch (error) {
    console.error("Error fetching client by ID:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Update a client by ID
// @route   PUT /api/clients/:id
// @access  Public
export const updateClient = async (req, res) => {
  try {
    const { name, emailAddress, phoneNumber, address, notes, isImportant } = req.body;

    const updatedClient = await Client.findByIdAndUpdate(
      req.params.id,
      { name, emailAddress, phoneNumber, address, notes, isImportant },
      { new: true, runValidators: true }
    );

    if (!updatedClient) {
      return res.status(404).json({ message: "Client not found" });
    }

    res.status(200).json(updatedClient);
  } catch (error) {
    console.error("Error updating client:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Delete a client by ID
// @route   DELETE /api/clients/:id
// @access  Public
export const deleteClient = async (req, res) => {
  try {
    const client = await Client.findByIdAndDelete(req.params.id);
    if (!client) {
      return res.status(404).json({ message: "Client not found" });
    }
    res.json({ message: "Client deleted successfully" });
  } catch (error) {
    console.error("Error deleting client:", error);
    res.status(500).json({ message: "Error deleting client" });
  }
};



export const getClientProjects = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate the client ID
    const client = await Client.findById(id);
    if (!client) {
      return res.status(404).json({ message: "Client not found" });
    }

    // Fetch projects associated with the client
    const projects = await Project.find({ clientId: id });

    res.status(200).json(projects);
  } catch (error) {
    console.error("Error fetching projects:", error);
    res.status(500).json({ message: "Server error" });
  }
};


// Download client as an Excel file

export const downloadClients = async (req, res) => {
  try {
    const clients = await Client.find();
    const projects = await Project.find();
    const employees = await Employee.find();
    const timesheets = await Timesheet.find()
      .populate('employeeId')
      .populate('projectId')
      .populate('clientId');

    if (!clients.length) {
      return res.status(404).json({ error: 'No clients found' });
    }

    const dataMap = {};

    timesheets.forEach((ts) => {
      const clientId = ts.clientId?._id?.toString();
      const projectId = ts.projectId?._id?.toString();
      const employeeId = ts.employeeId?._id?.toString();

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
      if (!isoString) return '';
      const date = new Date(isoString);
      return format(date, 'hh:mm a'); // Format like "09:00 AM"
    };

    const formatDateOnly = (isoString) => {
      if (!isoString) return '';
      const date = new Date(isoString);
      return format(date, 'dd/MM/yyyy'); // Format like "17/04/2025"
    };

    const formatDayOnly = (isoString) => {
      if (!isoString) return '';
      const date = new Date(isoString);
      return format(date, 'EEEE'); // "Monday", "Tuesday", etc.
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
    res.status(500).json({ error: 'Failed to generate Excel file' });
  }
};;
