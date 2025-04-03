import Project from "../models/Project.js";


// ✅ Create a new project linked to a client
export const createProject = async (req, res) => {
  const { clientId } = req.params;
  const { name, startDate, finishDate, address, expectedHours, notes, isImportant, status } = req.body;

  if (!name || !clientId) {
    return res.status(400).json({ error: "Project name and client ID are required." });
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
      clientId
    });

    await newProject.save();
    res.status(201).json({ message: "Project created successfully", project: newProject });

  } catch (error) {
    console.error("Error creating project:", error);

    res.status(500).json({ error: "Server error while creating project." });
  }
};

// Fetch all projects
export const getAllProjects = async (req, res) => {
  try {
    const projects = await Project.find();
    res.status(200).json(projects);
  } catch (error) {
    console.error("Error fetching all projects:", error);
    res.status(500).json({ message: "Server error while fetching projects." });
  }
};

// Fetch projects by client ID
export const getProjectsByClientId = async (req, res) => {
  const { clientId } = req.params;

  if (!clientId || clientId.length !== 24) {
    return res.status(400).json({ message: "Invalid client ID format." });
  }

  try {
    const projects = await Project.find({ clientId });

    if (!projects.length) {
      return res.status(404).json({ message: "No projects found for this client." });
    }

    res.status(200).json(projects);
  } catch (error) {
    console.error("Error fetching projects by client:", error);
    res.status(500).json({ message: "Server error while fetching projects." });
  }
};

// ✅ Get project by ID
export const getProjectById = async (req, res) => {
  const { projectId } = req.params;

  try {
    const project = await Project.findById(projectId);

    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    res.status(200).json(project);

  } catch (error) {
    console.error("Error fetching project:", error);
    res.status(500).json({ error: "Server error while fetching project." });
  }
};

// ✅ Update an existing project
export const updateProject = async (req, res) => {
  const { projectId } = req.params;
  const updates = req.body;

  try {
    const project = await Project.findByIdAndUpdate(
      projectId,
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    res.status(200).json({ message: "Project updated successfully", project });

  } catch (error) {
    console.error("Error updating project:", error);
    res.status(500).json({ message: "Server error while updating project" });
  }
};

// ✅ Delete project by ID
export const deleteProject = async (req, res) => {
  const { projectId } = req.params;

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
