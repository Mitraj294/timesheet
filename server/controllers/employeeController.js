// /home/digilab/timesheet/server/controllers/employeeController.js
import mongoose from "mongoose";
import asyncHandler from "express-async-handler";
import Employee from "../models/Employee.js";
import Role from "../models/Role.js";
import User from "../models/User.js";
import Timesheet from "../models/Timesheet.js";
import VehicleReview from "../models/VehicleReview.js";
import Schedule from "../models/Schedule.js";

// Get all employees for employer, or self for employee
export const getEmployees = async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ message: "Not authorized, no user" });
  }
  try {
    let employees;
    if (req.user.role === "employer") {
      employees = await Employee.find({ employerId: req.user.id }).sort({
        name: 1,
      });
    } else if (req.user.role === "employee") {
      const employeeRecord = await Employee.findOne({
        userId: req.user.id,
      }).populate("employerId", "name email companyName phoneNumber country");
      employees = employeeRecord ? [employeeRecord] : [];
    } else {
      return res.status(403).json({ message: "Access denied for this role." });
    }
    res.json(employees);
  } catch (error) {
    console.error(
      "[employeeController.getEmployees] Error fetching employees:",
      error,
    );
    res.status(500).json({ message: "Server error fetching employees" });
  }
};

// Get current employee's profile
export const getMyEmployeeProfile = async (req, res) => {
  if (!req.user || !req.user.id) {
    return res.status(401).json({ message: "Not authorized, no user token" });
  }
  try {
    const employeeProfile = await Employee.findOne({
      userId: req.user.id,
    }).populate("employerId", "name email companyName phoneNumber country");
    if (!employeeProfile) {
      return res
        .status(404)
        .json({ message: "Employee profile not found for this user." });
    }
    res.json(employeeProfile);
  } catch (error) {
    console.error(
      "[employeeController.getMyEmployeeProfile] Error fetching employee profile:",
      error,
    );
    res.status(500).json({ message: "Server error fetching employee profile" });
  }
};

// Add a new employee (employer only)
export const addEmployee = async (req, res) => {
  try {
    const {
      name,
      email,
      employeeCode,
      wage,
      isAdmin,
      overtime,
      expectedHours,
      holidayMultiplier,
      userId,
    } = req.body;
    if (
      !name ||
      !email ||
      !employeeCode ||
      wage === undefined ||
      wage === null
    ) {
      return res.status(400).json({
        message: "Name, Email, Employee Code, and Wage are required.",
      });
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res
        .status(400)
        .json({ message: "Please provide a valid email address." });
    }
    const numericWage = Number(wage);
    if (isNaN(numericWage) || numericWage < 0) {
      return res
        .status(400)
        .json({ message: "Wage must be a non-negative number." });
    }
    // Prevent duplicate email or code
    const existingEmployeeByEmail = await Employee.findOne({ email });
    if (existingEmployeeByEmail) {
      return res.status(409).json({
        message: `An employee with the email '${email}' already exists.`,
      });
    }
    const existingEmployeeByCode = await Employee.findOne({ employeeCode });
    if (existingEmployeeByCode) {
      return res.status(409).json({
        message: `An employee with the code '${employeeCode}' already exists.`,
      });
    }
    const newEmployee = new Employee({
      name,
      email,
      employeeCode,
      wage: numericWage,
      isAdmin: isAdmin ?? false,
      overtime: overtime ?? false,
      expectedHours: expectedHours ?? 40,
      holidayMultiplier: holidayMultiplier ?? 1.5,
      userId: userId || null,
      employerId: req.user.id,
    });
    await newEmployee.save();
    res.status(201).json(newEmployee);
  } catch (error) {
    console.error(
      "[employeeController.addEmployee] Error adding employee:",
      error,
    );
    if (error.code === 11000) {
      let field = Object.keys(error.keyValue)[0];
      field =
        field === "employeeCode"
          ? "Employee Code"
          : field.charAt(0).toUpperCase() + field.slice(1);
      return res.status(409).json({
        message: `${field} '${error.keyValue[Object.keys(error.keyValue)[0]]}' already exists.`,
      });
    }
    if (error.name === "ValidationError") {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: "Server error while adding employee." });
  }
};

// Update an employee's details (employer only)
export const updateEmployee = async (req, res) => {
  try {
    const employeeId = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(employeeId)) {
      return res.status(400).json({ message: "Invalid Employee ID format." });
    }
    const {
      name,
      email,
      employeeCode,
      wage,
      isAdmin,
      overtime,
      expectedHours,
      holidayMultiplier,
    } = req.body;
    const updateFields = {};
    if (name !== undefined) updateFields.name = name;
    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res
          .status(400)
          .json({ message: "Please provide a valid email address." });
      }
      updateFields.email = email;
    }
    if (employeeCode) updateFields.employeeCode = employeeCode;
    if (wage !== undefined) {
      const numericWage = Number(wage);
      if (isNaN(numericWage) || numericWage < 0) {
        return res
          .status(400)
          .json({ message: "Wage must be a non-negative number." });
      }
      updateFields.wage = numericWage;
    }
    if (isAdmin !== undefined) updateFields.isAdmin = isAdmin;
    if (overtime !== undefined) updateFields.overtime = overtime;
    if (expectedHours !== undefined)
      updateFields.expectedHours = Number(expectedHours);
    if (holidayMultiplier !== undefined)
      updateFields.holidayMultiplier = Number(holidayMultiplier);

    const employee = await Employee.findOne({
      _id: employeeId,
      employerId: req.user.id,
    });
    if (!employee) {
      return res.status(404).json({
        message: "Employee not found or not associated with this employer.",
      });
    }
    // Prevent duplicate email/code for other employees
    if (updateFields.email && updateFields.email !== employee.email) {
      const existingEmployeeByEmail = await Employee.findOne({
        email: updateFields.email,
        _id: { $ne: employeeId },
      });
      if (existingEmployeeByEmail) {
        return res.status(409).json({
          message: `An employee with the email '${updateFields.email}' already exists.`,
        });
      }
    }
    if (
      updateFields.employeeCode &&
      updateFields.employeeCode !== employee.employeeCode
    ) {
      const existingEmployeeByCode = await Employee.findOne({
        employeeCode: updateFields.employeeCode,
        _id: { $ne: employeeId },
      });
      if (existingEmployeeByCode) {
        return res.status(409).json({
          message: `An employee with the code '${updateFields.employeeCode}' already exists.`,
        });
      }
    }
    const updatedEmployee = await Employee.findByIdAndUpdate(
      employeeId,
      { $set: updateFields },
      { new: true, runValidators: true },
    );
    res.json(updatedEmployee);
  } catch (error) {
    console.error(
      "[employeeController.updateEmployee] Error updating employee:",
      error,
    );
    if (error.code === 11000) {
      let field = Object.keys(error.keyValue)[0];
      field =
        field === "employeeCode"
          ? "Employee Code"
          : field.charAt(0).toUpperCase() + field.slice(1);
      return res.status(409).json({
        message: `${field} '${error.keyValue[Object.keys(error.keyValue)[0]]}' already exists.`,
      });
    }
    if (error.name === "ValidationError") {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: "Server error while updating employee." });
  }
};

// Batch update notification preferences for employees (employer only)
export const batchUpdateEmployeeNotificationPreferences = asyncHandler(
  async (req, res) => {
    const updates = req.body.preferences;
    if (!updates) {
      return res.status(400).json({
        message: "Invalid request payload: 'preferences' array is missing.",
      });
    }
    let employerIdForFilter;
    if (req.user && req.user.role === "employer") {
      employerIdForFilter = req.user.id;
    } else if (req.user && req.user.employerId) {
      employerIdForFilter = req.user.employerId;
    }
    if (!req.user || !employerIdForFilter) {
      res.status(401);
      throw new Error("User not authorized or employer context missing.");
    }
    if (!Array.isArray(updates) || updates.length === 0) {
      res.status(400);
      throw new Error("No notification preferences provided for update.");
    }
    try {
      const bulkOps = updates
        .map((update) => {
          if (
            !update.employeeId ||
            typeof update.receivesNotifications !== "boolean"
          ) {
            return null;
          }
          return {
            updateOne: {
              filter: {
                _id: update.employeeId,
                employerId: employerIdForFilter,
              },
              update: {
                $set: {
                  receivesActionNotifications: update.receivesNotifications,
                },
              },
            },
          };
        })
        .filter((op) => op !== null);
      if (bulkOps.length > 0) {
        const result = await Employee.bulkWrite(bulkOps);
        res.status(200).json({
          message: "Employee notification preferences updated successfully.",
          modifiedCount: result.modifiedCount,
        });
      } else {
        res.status(400).json({
          message: "No valid employee notification preferences to update.",
        });
      }
    } catch (error) {
      console.error(
        "Error batch updating employee notification preferences:",
        error,
      );
      res.status(500).json({
        message:
          "Server error during batch update of notification preferences.",
      });
    }
  },
);

// Delete an employee and associated user (employer only)
export const deleteEmployee = async (req, res) => {
  const employeeId = req.params.id;
  if (!mongoose.Types.ObjectId.isValid(employeeId)) {
    return res.status(400).json({ message: "Invalid Employee ID format." });
  }
  let session;
  try {
    session = await mongoose.startSession();
    session.startTransaction();
    const employeeToDelete = await Employee.findOne({
      _id: employeeId,
      employerId: req.user.id,
    }).session(session);
    if (!employeeToDelete) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({
        message: "Employee not found or not associated with this employer.",
      });
    }
    // Remove employee from assigned roles
    await Role.updateMany(
      { assignedEmployees: employeeId },
      { $pull: { assignedEmployees: employeeId } },
      { session },
    );
    const userIdToDelete = employeeToDelete.userId;
    // Optionally delete related data (commented out)
    // await Timesheet.deleteMany({ employeeId: employeeToDelete._id }, { session });
    // await VehicleReview.deleteMany({ employeeId: employeeToDelete._id }, { session });
    // await Schedule.deleteMany({ employee: employeeToDelete._id }, { session });
    await Employee.findByIdAndDelete(employeeToDelete._id, { session });
    if (userIdToDelete) {
      const userAccountToDelete =
        await User.findById(userIdToDelete).session(session);
      if (userAccountToDelete) {
        await User.findByIdAndDelete(userAccountToDelete._id, { session });
      }
    }
    await session.commitTransaction();
    res.json({
      message: "Employee and all associated data deleted successfully.",
    });
  } catch (error) {
    if (session && session.inTransaction()) {
      await session.abortTransaction();
    }
    console.error(
      "[employeeController.deleteEmployee] Error deleting employee:",
      error,
    );
    res.status(500).json({
      message: "Server error during employee deletion process.",
      error: error.message,
    });
  } finally {
    if (session) {
      session.endSession();
    }
  }
};

export default employeeControllerFactory;
