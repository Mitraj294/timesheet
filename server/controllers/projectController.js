import Project from "../models/Project.js";
import Timesheet from "../models/Timesheet.js";
import mongoose from "mongoose";
import sendEmail from "../services/emailService.js";
import {
  generateProjectTimesheetReport,
  sendExcelDownload,
} from "../services/reportService.js";

// Create a new project for a client
export const createProject = async (req, res) => {
  const { clientId } = req.params;
  const {
    name,
    startDate,
    finishDate,
    address,
    expectedHours,
    notes,
    isImportant,
    status,
  } = req.body;

  if (!name || !clientId) {
    return res
      .status(400)
      .json({ message: "Project name and client ID are required." });
  }
  if (!mongoose.Types.ObjectId.isValid(clientId)) {
    return res.status(400).json({ message: "Invalid Client ID format." });
  }

  try {
    const newProject = new Project({
      name,
      startDate,
      finishDate,
      address,
      expectedHours,
      notes,
      isImportant: isImportant || false,
      status: status || "Ongoing",
      clientId,
    });
    await newProject.save();
    // Populate clientId to include client name in the response
    await newProject.populate("clientId", "name");
    res
      .status(201)
      .json({ message: "Project created successfully", project: newProject });
  } catch (error) {
    // Error creating project
    if (error.code === 11000) {
      return res.status(409).json({
        message: "A project with this name might already exist for the client.",
      });
    }
    res.status(500).json({ message: "Server error while creating project." });
  }
};

// Get all projects (for admin/employer)
export const getAllProjects = async (req, res) => {
  try {
    const projects = await Project.find().populate("clientId", "name");
    res.status(200).json(projects);
  } catch (error) {
    // Error fetching all projects
    res
      .status(500)
      .json({ message: "Server error while fetching all projects." });
  }
};

// Get all projects for a specific client
export const getProjectsByClientId = async (req, res) => {
  const { clientId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(clientId)) {
    return res.status(400).json({ message: "Invalid client ID format." });
  }
  try {
    const projects = await Project.find({ clientId }).populate(
      "clientId",
      "name",
    );
    res.status(200).json(projects);
  } catch (error) {
    // Error fetching projects by client
    res.status(500).json({
      message: "Server error while fetching projects for the client.",
    });
  }
};

// Get a single project by its ID, including total actual hours
export const getProjectById = async (req, res) => {
  const { projectId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(projectId)) {
    return res.status(400).json({ message: "Invalid Project ID format" });
  }
  try {
    const project = await Project.findById(projectId)
      .populate("clientId", "name")
      .lean();
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }
    // Calculate total actual hours from timesheets
    const timesheetHoursResult = await Timesheet.aggregate([
      {
        $match: {
          projectId: new mongoose.Types.ObjectId(projectId),
          leaveType: "None",
        },
      },
      { $group: { _id: null, totalActualHours: { $sum: "$totalHours" } } },
    ]);
    project.totalActualHours =
      timesheetHoursResult.length > 0
        ? timesheetHoursResult[0].totalActualHours
        : 0;
    res.status(200).json(project);
  } catch (error) {
    // Error fetching project
    res.status(500).json({ message: "Server error while fetching project." });
  }
};

// Update a project by its ID
export const updateProject = async (req, res) => {
  const { projectId } = req.params;
  const updates = req.body;
  if (!mongoose.Types.ObjectId.isValid(projectId)) {
    return res.status(400).json({ message: "Invalid Project ID format" });
  }
  if (updates.clientId && !mongoose.Types.ObjectId.isValid(updates.clientId)) {
    return res
      .status(400)
      .json({ message: "Invalid Client ID format in update data." });
  }
  try {
    const updatedProject = await Project.findByIdAndUpdate(
      projectId,
      { $set: updates },
      { new: true, runValidators: true },
    )
      .populate("clientId", "name")
      .lean();
    if (!updatedProject) {
      return res.status(404).json({ message: "Project not found" });
    }
    // Update total actual hours after update
    const timesheetHoursResult = await Timesheet.aggregate([
      {
        $match: {
          projectId: new mongoose.Types.ObjectId(projectId),
          leaveType: "None",
        },
      },
      { $group: { _id: null, totalActualHours: { $sum: "$totalHours" } } },
    ]);
    updatedProject.totalActualHours =
      timesheetHoursResult.length > 0
        ? timesheetHoursResult[0].totalActualHours
        : 0;
    res.status(200).json({
      message: "Project updated successfully",
      project: updatedProject,
    });
  } catch (error) {
    // Error updating project
    if (error.code === 11000) {
      return res
        .status(409)
        .json({ message: "Update failed due to duplicate key constraint." });
    }
    res.status(500).json({ message: "Server error while updating project." });
  }
};

// Delete a project by its ID
export const deleteProject = async (req, res) => {
  const { projectId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(projectId)) {
    return res.status(400).json({ message: "Invalid Project ID format" });
  }
  try {
    // Note: Associated timesheets are not deleted here.
    const deletedProject = await Project.findByIdAndDelete(projectId);
    if (!deletedProject) {
      return res.status(404).json({ message: "Project not found" });
    }
    res.status(200).json({ message: "Project deleted successfully" });
  } catch (error) {
    // Error deleting project
    res.status(500).json({ message: "Server error while deleting project." });
  }
};

// Download project timesheet report as Excel
export const downloadProjectReport = async (req, res) => {
  try {
    const { projectIds = [] } = req.body;
    let projects;
    if (projectIds.length > 0) {
      projects = await Project.find({ _id: { $in: projectIds } }).lean();
    } else {
      projects = await Project.find().lean();
    }
    if (!projects.length) {
      return res
        .status(404)
        .json({ message: "No projects found to generate a report." });
    }
    const projectTimesheets = await Timesheet.find({
      projectId: { $in: projects.map((p) => p._id) },
    })
      .populate("employeeId", "name")
      .lean();
    const buffer = await generateProjectTimesheetReport({
      projects,
      projectTimesheets,
    });
    const filename = `Project_Timesheet_Report_${new Date()
      .toISOString()
      .replace(/[-:.TZ]/g, "")
      .slice(0, 14)}.xlsx`;
    sendExcelDownload(res, buffer, filename);
  } catch (error) {
    // Project Excel download error
    if (!res.headersSent) {
      res
        .status(500)
        .json({ message: `Failed to generate Excel file: ${error.message}` });
    } else {
      res.end();
    }
  }
};

// Send project timesheet report via email (Excel attachment)
export const sendProjectReportEmail = async (req, res) => {
  try {
    const { email, projectIds = [] } = req.body;
    if (!email || !/\S+@\S+\.\S+/.test(email)) {
      return res
        .status(400)
        .json({ message: "Valid recipient email is required." });
    }
    let projects;
    if (projectIds.length > 0) {
      projects = await Project.find({ _id: { $in: projectIds } }).lean();
    } else {
      projects = await Project.find().lean();
    }
    if (!projects.length) {
      return res
        .status(404)
        .json({ message: "No projects found to generate a report." });
    }
    const projectTimesheets = await Timesheet.find({
      projectId: { $in: projects.map((p) => p._id) },
    })
      .populate("employeeId", "name")
      .lean();
    const buffer = await generateProjectTimesheetReport({
      projects,
      projectTimesheets,
    });
    const filename = `Project_Timesheet_Report_${new Date()
      .toISOString()
      .replace(/[-:.TZ]/g, "")
      .slice(0, 14)}.xlsx`;
    await sendEmail({
      to: email,
      subject: "Project Timesheet Report",
      text: "Please find the attached project timesheet report.",
      attachments: [{ filename, content: buffer }],
    });
    res
      .status(200)
      .json({ message: "Project timesheet report sent successfully!" });
  } catch (error) {
    // Project report email error
    res
      .status(500)
      .json({ message: `Failed to send project report: ${error.message}` });
  }
};
