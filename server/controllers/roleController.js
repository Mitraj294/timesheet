import Role from "../models/Role.js";
import Employee from "../models/Employee.js";
import { DateTime } from "luxon";
import sendEmail, {
  sendRoleAssignmentEmail,
  sendRoleUpdateEmail,
} from "../services/emailService.js";

// Create a new role (employer only)
export const createRole = async (req, res) => {
  if (req.user.role !== "employer") {
    return res
      .status(403)
      .json({ message: "Forbidden: Only employers can create roles." });
  }
  try {
    const { roleName, roleDescription, color, assignedEmployees, schedule } =
      req.body;
    const employerId = req.user._id;

    // Convert schedule times to UTC for storage
    const schedulesArray = schedule.map((sch) => ({
      day: sch.day,
      startTime: sch.startTime
        ? DateTime.fromFormat(sch.startTime, "HH:mm", {
            zone: sch.timezone || "UTC",
          })
            .toUTC()
            .toFormat("HH:mm")
        : "",
      endTime: sch.endTime
        ? DateTime.fromFormat(sch.endTime, "HH:mm", {
            zone: sch.timezone || "UTC",
          })
            .toUTC()
            .toFormat("HH:mm")
        : "",
    }));

    const newRole = new Role({
      employerId,
      roleName,
      roleDescription,
      color,
      assignedEmployees,
      schedule: schedulesArray,
    });

    await newRole.save();

    // Notify assigned employees by email
    if (newRole.assignedEmployees && newRole.assignedEmployees.length > 0) {
      for (const empId of newRole.assignedEmployees) {
        try {
          const employee = await Employee.findById(empId).populate(
            "userId",
            "email name",
          );
          if (employee && employee.userId && employee.userId.email) {
            await sendRoleAssignmentEmail(employee, newRole.roleName);
          }
        } catch (emailError) {
          console.error(
            `[RoleCtrl] Failed to send new role notification to employee ${empId}:`,
            emailError,
          );
        }
      }
    }

    res
      .status(201)
      .json({ message: "Role created successfully", role: newRole });
  } catch (err) {
    console.error("Error creating role:", err);
    if (err.name === "ValidationError") {
      return res.status(400).json({ message: err.message });
    }
    res
      .status(500)
      .json({ message: "Server error while creating role: " + err.message });
  }
};

// Get all roles for employer or employee's employer
export const getRoles = async (req, res) => {
  try {
    let targetEmployerId;
    if (req.user.role === "employer") {
      targetEmployerId = req.user._id;
    } else if (req.user.role === "employee") {
      const employeeRecord = await Employee.findOne({ userId: req.user._id })
        .select("employerId")
        .lean();
      if (!employeeRecord || !employeeRecord.employerId) {
        return res.status(404).json({
          message:
            "Employee record or associated employer not found for fetching roles.",
        });
      }
      targetEmployerId = employeeRecord.employerId;
    } else {
      return res
        .status(403)
        .json({ message: "Forbidden: User role cannot access roles." });
    }
    if (!targetEmployerId) {
      return res
        .status(400)
        .json({ message: "Could not determine employer for fetching roles." });
    }
    const roles = await Role.find({ employerId: targetEmployerId })
      .populate("assignedEmployees", "name")
      .sort({ createdAt: -1 });
    res.status(200).json(roles);
  } catch (err) {
    console.error("Get roles error:", err);
    res
      .status(500)
      .json({ message: "Server error while fetching roles: " + err.message });
  }
};

// Get a single role by ID (employer or employee)
export const getRoleById = async (req, res) => {
  try {
    const role = await Role.findById(req.params.id).populate(
      "assignedEmployees",
      "name",
    );
    if (!role) {
      return res.status(404).json({ message: "Role not found" });
    }
    let canAccess = false;
    if (
      req.user.role === "employer" &&
      role.employerId.toString() === req.user._id.toString()
    ) {
      canAccess = true;
    } else if (req.user.role === "employee") {
      const employeeRecord = await Employee.findOne({ userId: req.user._id })
        .select("employerId")
        .lean();
      if (
        employeeRecord &&
        employeeRecord.employerId &&
        role.employerId.toString() === employeeRecord.employerId.toString()
      ) {
        canAccess = true;
      }
    }
    if (!canAccess) {
      return res.status(403).json({
        message: "Forbidden: You do not have permission to access this role.",
      });
    }
    res.status(200).json(role);
  } catch (err) {
    console.error("Error fetching role:", err);
    if (err.kind === "ObjectId") {
      return res
        .status(404)
        .json({ message: "Role not found (invalid ID format)" });
    }
    res
      .status(500)
      .json({ message: "Server error while fetching role: " + err.message });
  }
};

// Update a role (employer only)
export const updateRole = async (req, res) => {
  if (req.user.role !== "employer") {
    return res
      .status(403)
      .json({ message: "Forbidden: Only employers can update roles." });
  }
  try {
    const { id } = req.params;
    const employerId = req.user._id;
    const updateData = req.body;
    const significantChange =
      updateData.hasOwnProperty("schedule") ||
      updateData.hasOwnProperty("assignedEmployees");
    if (updateData.employerId) {
      delete updateData.employerId;
    }
    const originalRole = await Role.findOne({
      _id: id,
      employerId: employerId,
    });
    const updatedRole = await Role.findOneAndUpdate(
      { _id: id, employerId: employerId },
      updateData,
      { new: true, runValidators: true },
    ).populate("assignedEmployees", "name");
    if (!updatedRole) {
      const roleExists = await Role.findById(id);
      if (roleExists) {
        return res
          .status(403)
          .json({ message: "Forbidden: You do not own this role." });
      }
      return res.status(404).json({ message: "Role not found." });
    }
    // Notify employees if assignments or schedule changed
    if (
      significantChange &&
      updatedRole.assignedEmployees &&
      updatedRole.assignedEmployees.length > 0
    ) {
      for (const empId of updatedRole.assignedEmployees) {
        try {
          const employee = await Employee.findById(empId).populate(
            "userId",
            "email name",
          );
          if (employee && employee.userId && employee.userId.email) {
            const isNewlyAssigned =
              originalRole &&
              !originalRole.assignedEmployees
                .map(String)
                .includes(String(empId));
            if (isNewlyAssigned) {
              await sendRoleAssignmentEmail(employee, updatedRole.roleName);
            } else {
              await sendRoleUpdateEmail(employee, updatedRole.roleName);
            }
          }
        } catch (emailError) {
          console.error(
            `[RoleCtrl] Failed to send role update notification to employee ${empId}:`,
            emailError,
          );
        }
      }
    }
    res
      .status(200)
      .json({ message: "Role updated successfully", role: updatedRole });
  } catch (err) {
    console.error("Error updating role:", err);
    if (err.name === "ValidationError") {
      return res.status(400).json({ message: err.message });
    }
    if (err.kind === "ObjectId") {
      return res
        .status(404)
        .json({ message: "Role not found (invalid ID format)" });
    }
    res
      .status(500)
      .json({ message: "Server error while updating role: " + err.message });
  }
};

// Delete a role (employer only)
export const deleteRole = async (req, res) => {
  if (req.user.role !== "employer") {
    return res
      .status(403)
      .json({ message: "Forbidden: Only employers can delete roles." });
  }
  try {
    const { id } = req.params;
    const employerId = req.user._id;
    const deletedRole = await Role.findOneAndDelete({
      _id: id,
      employerId: employerId,
    });
    if (!deletedRole) {
      const roleExists = await Role.findById(id);
      if (roleExists) {
        return res
          .status(403)
          .json({ message: "Forbidden: You do not own this role." });
      }
      return res.status(404).json({ message: "Role not found." });
    }
    res.status(200).json({ message: "Role deleted successfully" });
  } catch (err) {
    console.error("Error deleting role:", err);
    if (err.kind === "ObjectId") {
      return res
        .status(404)
        .json({ message: "Role not found (invalid ID format)" });
    }
    res
      .status(500)
      .json({ message: "Server error while deleting role: " + err.message });
  }
};

// Delete a specific schedule entry from a role (employer only)
export const deleteScheduleFromRole = async (req, res) => {
  const { roleId, scheduleId } = req.params;
  const employerId = req.user._id;
  if (req.user.role !== "employer") {
    return res.status(403).json({
      message: "Forbidden: Only employers can modify role schedules.",
    });
  }
  try {
    // Ensure role belongs to employer
    const role = await Role.findOne({ _id: roleId, employerId: employerId });
    if (!role) {
      return res.status(403).json({
        message: "Forbidden: Role not found or you do not own this role.",
      });
    }
    // Remove schedule entry by _id
    const updatedRole = await Role.findByIdAndUpdate(
      { _id: roleId, employerId: employerId },
      { $pull: { schedule: { _id: scheduleId } } },
      { new: true },
    );
    if (!updatedRole) {
      return res
        .status(404)
        .json({ message: "Role not found or schedule entry not modified." });
    }
    res
      .status(200)
      .json({ message: "Schedule entry removed from role", role: updatedRole });
  } catch (err) {
    console.error("Error deleting schedule entry from role:", err);
    if (err.kind === "ObjectId") {
      return res
        .status(404)
        .json({ message: "Resource not found (invalid ID format)" });
    }
    res.status(500).json({
      message:
        "Server error while deleting schedule entry from role: " + err.message,
    });
  }
};
