import ExcelJS from "exceljs";
import { format } from "date-fns";

// Factory function for dependency injection
export default ({
  Client,
  Employee,
  Project,
  Timesheet,
  sendEmail,
  generateClientTimesheetReport,
  sendExcelDownload,
  mongoose,
}) => ({
  // Create a new client (employer only)
  createClient: async (req, res) => {
    try {
      const { name, emailAddress, phoneNumber, address, notes, isImportant } =
        req.body;
      if (!name || !emailAddress || !phoneNumber) {
        return res.status(400).json({
          message: "Name, Email Address, and Phone Number are required.",
        });
      }
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(emailAddress)) {
        return res
          .status(400)
          .json({ message: "Name, Email, and Phone are required." });
      }
      // Prevent duplicate client names for same employer
      const existingClientByName = await Client.findOne({
        name,
        employerId: req.user.id,
      });
      if (existingClientByName) {
        return res
          .status(409)
          .json({ message: `A client named '${name}' already exists.` });
      }
      const newClient = new Client({
        name,
        emailAddress,
        phoneNumber,
        address,
        notes,
        isImportant,
        employerId: req.user.id,
      });
      const savedClient = await newClient.save();
      res.status(201).json({ _id: savedClient._id, name: savedClient.name });
    } catch (error) {
      res.status(500).json({ message: "Error creating client" });
    }
  },

  // Get all clients for employer or employee's employer
  getClients: async (req, res) => {
    try {
      let targetEmployerId;
      if (req.user.role === "employer") {
        targetEmployerId = req.user.id;
      } else if (req.user.role === "employee") {
        // Get employerId from employee record
        const employeeRecord = await Employee.findOne({ userId: req.user.id })
          .select("employerId")
          .lean();
        if (!employeeRecord || !employeeRecord.employerId) {
          return res.status(200).json([]);
        }
        targetEmployerId = employeeRecord.employerId;
      } else {
        return res.status(403).json({ message: "Access denied for this role." });
      }
      const clients = await Client.find({ employerId: targetEmployerId }).sort({
        name: 1,
      });
      res.status(200).json(clients || []);
    } catch (error) {
      res.status(500).json({ message: "Error fetching clients" });
    }
  },

  // Get a single client by ID (employer/employee)
  getClientById: async (req, res) => {
    try {
      const clientId = req.params.id;
      if (!mongoose.Types.ObjectId.isValid(clientId)) {
        return res.status(400).json({ message: "Invalid Client ID format." });
      }
      let targetEmployerId;
      if (req.user.role === "employer") {
        targetEmployerId = req.user.id;
      } else if (req.user.role === "employee") {
        const employeeRecord = await Employee.findOne({ userId: req.user.id })
          .select("employerId")
          .lean();
        if (!employeeRecord || !employeeRecord.employerId) {
          return res.status(403).json({
            message: "Access denied: Employee not linked to an employer.",
          });
        }
        targetEmployerId = employeeRecord.employerId;
      } else {
        return res.status(403).json({ message: "Access denied for this role." });
      }
      const client = await Client.findOne({
        _id: clientId,
        employerId: targetEmployerId,
      });
      if (!client) {
        return res.status(404).json({ message: "Client not found" });
      }
      res.status(200).json(client);
    } catch (error) {
      if (error.kind === "ObjectId" && error.path === "_id") {
        return res.status(404).json({
          message: "Client not found (invalid ID format during query).",
        });
      }
      res
        .status(500)
        .json({ message: "Server error while fetching client details." });
    }
  },

  // Update a client by ID (employer only)
  updateClient: async (req, res) => {
    try {
      const { name, emailAddress, phoneNumber, address, notes, isImportant } =
        req.body;
      // Validate email if provided
      if (emailAddress) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(emailAddress)) {
          return res
            .status(400)
            .json({ message: "Please provide a valid email address." });
        }
      }
      // Find client and check ownership
      let clientToUpdate = await Client.findOne({
        _id: req.params.id,
        employerId: req.user.id,
      });
      if (!clientToUpdate) {
        return res.status(404).json({
          message: "Client not found or not associated with this employer.",
        });
      }
      // Prevent duplicate name for same employer
      if (name && name !== clientToUpdate.name) {
        const existingClientByName = await Client.findOne({
          name,
          employerId: req.user.id,
          _id: { $ne: req.params.id },
        });
        if (existingClientByName) {
          return res
            .status(409)
            .json({ message: `Another client named '${name}' already exists.` });
        }
      }
      const updatedClient = await Client.findByIdAndUpdate(
        req.params.id,
        { name, emailAddress, phoneNumber, address, notes, isImportant },
        { new: true, runValidators: true },
      );
      res.status(200).json(updatedClient);
    } catch (error) {
      res.status(500).json({ message: "Error updating client" });
    }
  },

  // Delete a client by ID (employer only)
  deleteClient: async (req, res) => {
    try {
      const client = await Client.findOneAndDelete({
        _id: req.params.id,
        employerId: req.user.id,
      });
      if (!client) {
        return res.status(404).json({ message: "Client not found" });
      }
      res.json({ message: "Client deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Error deleting client" });
    }
  },

  // Get all projects for a specific client (employer only)
  getClientProjects: async (req, res) => {
    try {
      const { id } = req.params;
      // Ensure client belongs to employer
      const client = await Client.findOne({ _id: id, employerId: req.user.id });
      if (!client) {
        return res.status(404).json({ message: "Client not found" });
      }
      const projects = await Project.find({ clientId: id });
      res.status(200).json(projects);
    } catch (error) {
      res.status(500).json({ message: "Error fetching client projects" });
    }
  },

  // Download timesheet data grouped by clients, projects, and employees as Excel
  downloadClients: async (req, res) => {
    try {
      const employerId = req.user.id;
      // Get all clients for employer
      const employerClients = await Client.find({ employerId })
        .select("_id name")
        .lean();
      if (!employerClients.length) {
        return res.status(404).json({
          message: "No clients found for this employer to generate a report.",
        });
      }
      const employerClientIds = employerClients.map((client) => client._id);
      const employerEmployees = await Employee.find({ employerId })
        .select("_id name")
        .lean();
      const employerEmployeeIds = employerEmployees.map((emp) => emp._id);
      const clientProjects = await Project.find({
        clientId: { $in: employerClientIds },
      })
        .select("_id name clientId")
        .lean();
      // Get all relevant timesheets for report
      const relevantTimesheets = await Timesheet.find({
        clientId: { $in: employerClientIds },
        projectId: { $in: clientProjects.map((p) => p._id) },
        employeeId: { $in: employerEmployeeIds },
      })
        .populate("employeeId", "name")
        .populate("projectId", "name")
        .populate("clientId", "name")
        .sort({ date: 1, startTime: 1 })
        .lean();
      // Group timesheets for report structure
      const timesheetsGrouped = relevantTimesheets.reduce((acc, ts) => {
        const clientIdStr = ts.clientId?._id?.toString();
        const projectIdStr = ts.projectId?._id?.toString();
        const employeeIdStr = ts.employeeId?._id?.toString();
        if (!clientIdStr || !projectIdStr || !employeeIdStr) return acc;
        acc[clientIdStr] = acc[clientIdStr] || {};
        acc[clientIdStr][projectIdStr] = acc[clientIdStr][projectIdStr] || {};
        acc[clientIdStr][projectIdStr][employeeIdStr] =
          acc[clientIdStr][projectIdStr][employeeIdStr] || [];
        acc[clientIdStr][projectIdStr][employeeIdStr].push(ts);
        return acc;
      }, {});
      // Generate Excel buffer and send as download
      const buffer = await generateClientTimesheetReport({
        employerClients,
        clientProjects,
        employerEmployees,
        timesheetsGrouped,
      });
      const filename = `Client_Timesheet_Report_${format(
        new Date(),
        "yyyyMMdd_HHmmss",
      )}.xlsx`;
      sendExcelDownload(res, buffer, filename);
    } catch (error) {
      if (!res.headersSent) {
        res
          .status(500)
          .json({ message: `Failed to generate Excel file: ${error.message}` });
      } else {
        res.end();
      }
    }
  },

  // Send client timesheet report via email (Excel attachment)
  sendClientsReportEmail: async (req, res) => {
    try {
      const { email } = req.body;
      if (!email || !/\S+@\S+\.\S+/.test(email)) {
        return res
          .status(400)
          .json({ message: "Valid recipient email is required." });
      }
      const employerId = req.user.id;
      const employerClients = await Client.find({ employerId })
        .select("_id name")
        .lean();
      if (!employerClients.length) {
        return res.status(404).json({
          message: "No clients found for this employer to generate a report.",
        });
      }
      const employerClientIds = employerClients.map((client) => client._id);
      const employerEmployees = await Employee.find({ employerId })
        .select("_id name")
        .lean();
      const employerEmployeeIds = employerEmployees.map((emp) => emp._id);
      const clientProjects = await Project.find({
        clientId: { $in: employerClientIds },
      })
        .select("_id name clientId")
        .lean();
      const relevantTimesheets = await Timesheet.find({
        clientId: { $in: employerClientIds },
        projectId: { $in: clientProjects.map((p) => p._id) },
        employeeId: { $in: employerEmployeeIds },
      })
        .populate("employeeId", "name")
        .populate("projectId", "name")
        .populate("clientId", "name")
        .sort({ date: 1, startTime: 1 })
        .lean();
      const timesheetsGrouped = relevantTimesheets.reduce((acc, ts) => {
        const clientIdStr = ts.clientId?._id?.toString();
        const projectIdStr = ts.projectId?._id?.toString();
        const employeeIdStr = ts.employeeId?._id?.toString();
        if (!clientIdStr || !projectIdStr || !employeeIdStr) return acc;
        acc[clientIdStr] = acc[clientIdStr] || {};
        acc[clientIdStr][projectIdStr] = acc[clientIdStr][projectIdStr] || {};
        acc[clientIdStr][projectIdStr][employeeIdStr] =
          acc[clientIdStr][projectIdStr][employeeIdStr] || [];
        acc[clientIdStr][projectIdStr][employeeIdStr].push(ts);
        return acc;
      }, {});
      const buffer = await generateClientTimesheetReport({
        employerClients,
        clientProjects,
        employerEmployees,
        timesheetsGrouped,
      });
      const filename = `Client_Timesheet_Report_${format(
        new Date(),
        "yyyyMMdd_HHmmss",
      )}.xlsx`;
      await sendEmail({
        to: email,
        subject: "Client Timesheet Report",
        text: "Please find the attached client timesheet report.",
        attachments: [{ filename, content: buffer }],
      });
      res
        .status(200)
        .json({ message: "Client timesheet report sent successfully!" });
    } catch (error) {
      res
        .status(500)
        .json({ message: `Failed to send client report: ${error.message}` });
    }
  },
});
