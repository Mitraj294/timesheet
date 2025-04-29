import Project from "../models/Project.js";
import Timesheet from "../models/Timesheet.js";
import mongoose from 'mongoose';

export const createProject = async (req, res) => {
  const { clientId } = req.params;
  const { name, startDate, finishDate, address, expectedHours, notes, isImportant, status } = req.body;

  if (!name || !clientId) {
    return res.status(400).json({ error: "Project name and client ID are required." });
  }
  if (!mongoose.Types.ObjectId.isValid(clientId)) {
      return res.status(400).json({ error: "Invalid Client ID format." });
  }

  try {
    const newProject = new Project({
      name, startDate, finishDate, address, expectedHours, notes,
      isImportant: isImportant || false,
      status: status || "Ongoing",
      clientId
    });
    await newProject.save();
    await newProject.populate('clientId', 'name');
    res.status(201).json({ message: "Project created successfully", project: newProject });
  } catch (error) {
    console.error("Error creating project:", error);
    if (error.code === 11000) {
        return res.status(409).json({ error: "A project with similar details might already exist." });
    }
    res.status(500).json({ error: "Server error while creating project." });
  }
};

export const getAllProjects = async (req, res) => {
  try {
    const projects = await Project.find().populate('clientId', 'name');
    res.status(200).json(projects);
  } catch (error) {
    console.error("Error fetching all projects:", error);
    res.status(500).json({ message: "Server error while fetching projects." });
  }
};

export const getProjectsByClientId = async (req, res) => {
  const { clientId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(clientId)) {
    return res.status(400).json({ message: "Invalid client ID format." });
  }
  try {
    const projects = await Project.find({ clientId }).populate('clientId', 'name');
    res.status(200).json(projects);
  } catch (error) {
    console.error("Error fetching projects by client:", error);
    res.status(500).json({ message: "Server error while fetching projects." });
  }
};

export const getProjectById = async (req, res) => {
  const { projectId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(projectId)) {
      return res.status(400).json({ message: "Invalid Project ID format" });
  }

  try {
    const project = await Project.findById(projectId)
                                 .populate('clientId', 'name')
                                 .lean();

    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    const timesheetHoursResult = await Timesheet.aggregate([
        { $match: { projectId: new mongoose.Types.ObjectId(projectId), leaveType: 'None' } },
        { $group: { _id: null, totalActualHours: { $sum: "$totalHours" } } }
    ]);

    project.totalActualHours = timesheetHoursResult.length > 0 ? timesheetHoursResult[0].totalActualHours : 0;

    res.status(200).json(project);

  } catch (error) {
    console.error("Error fetching project:", error);
    res.status(500).json({ error: "Server error while fetching project." });
  }
};

export const updateProject = async (req, res) => {
  const { projectId } = req.params;
  const updates = req.body;

  if (!mongoose.Types.ObjectId.isValid(projectId)) {
      return res.status(400).json({ message: "Invalid Project ID format" });
  }
  if (updates.clientId && !mongoose.Types.ObjectId.isValid(updates.clientId)) {
      return res.status(400).json({ message: "Invalid Client ID format in update data." });
  }

  try {
    const updatedProject = await Project.findByIdAndUpdate(
      projectId,
      { $set: updates },
      { new: true, runValidators: true }
    ).populate('clientId', 'name').lean();

    if (!updatedProject) {
      return res.status(404).json({ message: "Project not found" });
    }

     const timesheetHoursResult = await Timesheet.aggregate([
        { $match: { projectId: new mongoose.Types.ObjectId(projectId), leaveType: 'None' } },
        { $group: { _id: null, totalActualHours: { $sum: "$totalHours" } } }
    ]);
    updatedProject.totalActualHours = timesheetHoursResult.length > 0 ? timesheetHoursResult[0].totalActualHours : 0;


    res.status(200).json({ message: "Project updated successfully", project: updatedProject });

  } catch (error) {
    console.error("Error updating project:", error);
    if (error.code === 11000) {
        return res.status(409).json({ message: "Update failed due to duplicate key constraint." });
    }
    res.status(500).json({ message: "Server error while updating project" });
  }
};

export const deleteProject = async (req, res) => {
  const { projectId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(projectId)) {
      return res.status(400).json({ message: "Invalid Project ID format" });
  }

  try {

    const deletedProject = await Project.findByIdAndDelete(projectId);

    if (!deletedProject) {
      return res.status(404).json({ message: "Project not found" });
    }

    res.status(200).json({ message: "Project deleted successfully" });

  } catch (error) {
    console.error("Error deleting project:", error);
    res.status(500).json({ error: "Server error while deleting project" });
  }
};
