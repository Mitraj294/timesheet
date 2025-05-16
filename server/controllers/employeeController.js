// /home/digilab/timesheet/server/controllers/employeeController.js
import mongoose from "mongoose";
import Employee from "../models/Employee.js";
import Role from "../models/Role.js";
import User from "../models/User.js"; // Import User model
import Timesheet from "../models/Timesheet.js"; // Import Timesheet model
import VehicleReview from "../models/VehicleReview.js"; // Import VehicleReview model
import Schedule from "../models/Schedule.js"; // Import Schedule model

// @desc    Get all employees or a specific employee for the logged-in user
// @route   GET /api/employees
// @access  Private
export const getEmployees = async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ message: "Not authorized, no user" });
  }

  try {
    let employees;
    if (req.user.role === 'employer') {
      // Employer gets all employees under their employerId
      employees = await Employee.find({ employerId: req.user.id })
                                .sort({ name: 1 }); // Optional: sort by name
    } else if (req.user.role === 'employee') {
      // Employee gets their own employee record by matching their userId
      const employeeRecord = await Employee.findOne({ userId: req.user.id })
        .populate('employerId', 'name email companyName phoneNumber country'); // Populate employer details
      employees = employeeRecord ? [employeeRecord] : [];
    } else {
      // For any other roles (e.g., admin, if you implement it) or if role is undefined
      return res.status(403).json({ message: "Access denied for this role." });
    }
    res.json(employees);
  } catch (error) {
    console.error("[employeeController.getEmployees] Error fetching employees:", error);
    res.status(500).json({ message: "Server error fetching employees" });
  }
};

// @desc    Get current logged-in employee's profile
// @route   GET /api/employees/me
// @access  Private (Employee needs to be authenticated)
export const getMyEmployeeProfile = async (req, res) => {
  if (!req.user || !req.user.id) { // req.user.id is the User._id
    return res.status(401).json({ message: "Not authorized, no user token" });
  }

  try {
    // Find the Employee record linked to the User ID from the token
    const employeeProfile = await Employee.findOne({ userId: req.user.id })
      .populate('employerId', 'name email companyName phoneNumber country'); // Populate employer details

    if (!employeeProfile) {
      return res.status(404).json({ message: "Employee profile not found for this user." });
    }
    res.json(employeeProfile); // Return the single employee profile object
  } catch (error) {
    console.error("[employeeController.getMyEmployeeProfile] Error fetching employee profile:", error);
    res.status(500).json({ message: "Server error fetching employee profile" });
  }
};

// @desc    Add a new employee
// @route   POST /api/employees
// @access  Private (Employer only)
export const addEmployee = async (req, res) => {
  // Middleware 'protect' and 'employerOnly' already ensure req.user is an employer
  try {
    const { name, email, employeeCode, wage, isAdmin, overtime, expectedHours, holidayMultiplier, userId } = req.body;
    
    if (!name || !email || !employeeCode || wage === undefined || wage === null) { // Check wage presence
      return res.status(400).json({ message: "Name, Email, Employee Code, and Wage are required." });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: "Please provide a valid email address." });
    }

    const numericWage = Number(wage);
    if (isNaN(numericWage) || numericWage < 0) { // Allow 0 wage if intended
      return res.status(400).json({ message: "Wage must be a non-negative number." });
    }

    const existingEmployeeByEmail = await Employee.findOne({ email });
    if (existingEmployeeByEmail) {
      return res.status(409).json({ message: `An employee with the email '${email}' already exists.` });
    }

    const existingEmployeeByCode = await Employee.findOne({ employeeCode });
    if (existingEmployeeByCode) {
      return res.status(409).json({ message: `An employee with the code '${employeeCode}' already exists.` });
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
      employerId: req.user.id 
    });

    await newEmployee.save();
    res.status(201).json(newEmployee);
  } catch (error) {
    console.error("[employeeController.addEmployee] Error adding employee:", error);
    if (error.code === 11000) { 
      let field = Object.keys(error.keyValue)[0];
      field = field === 'employeeCode' ? 'Employee Code' : field.charAt(0).toUpperCase() + field.slice(1);
      return res.status(409).json({ message: `${field} '${error.keyValue[Object.keys(error.keyValue)[0]]}' already exists.` });
    }
    if (error.name === 'ValidationError') {
        return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: "Server error while adding employee." });
  }
};


// @desc    Update an employee's details
// @route   PUT /api/employees/:id
// @access  Private (Employer only)
export const updateEmployee = async (req, res) => {
  // Middleware 'protect' and 'employerOnly' already ensure req.user is an employer
  try {
    const employeeId = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(employeeId)) {
        return res.status(400).json({ message: "Invalid Employee ID format." });
    }
    const { name, email, employeeCode, wage, isAdmin, overtime, expectedHours, holidayMultiplier } = req.body;

    const updateFields = {};
    if (name !== undefined) updateFields.name = name; // Allow empty string if intended
    if (email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ message: "Please provide a valid email address." });
        }
        updateFields.email = email;
    }
    if (employeeCode) updateFields.employeeCode = employeeCode;
    if (wage !== undefined) {
        const numericWage = Number(wage);
        if (isNaN(numericWage) || numericWage < 0) {
            return res.status(400).json({ message: "Wage must be a non-negative number." });
        }
        updateFields.wage = numericWage;
    }
    if (isAdmin !== undefined) updateFields.isAdmin = isAdmin;
    if (overtime !== undefined) updateFields.overtime = overtime;
    if (expectedHours !== undefined) updateFields.expectedHours = Number(expectedHours);
    if (holidayMultiplier !== undefined) updateFields.holidayMultiplier = Number(holidayMultiplier);

    const employee = await Employee.findOne({ _id: employeeId, employerId: req.user.id });
    if (!employee) {
      return res.status(404).json({ message: "Employee not found or not associated with this employer." });
    }

    if (updateFields.email && updateFields.email !== employee.email) {
        const existingEmployeeByEmail = await Employee.findOne({ email: updateFields.email, _id: { $ne: employeeId } });
        if (existingEmployeeByEmail) {
            return res.status(409).json({ message: `An employee with the email '${updateFields.email}' already exists.` });
        }
    }
    if (updateFields.employeeCode && updateFields.employeeCode !== employee.employeeCode) {
        const existingEmployeeByCode = await Employee.findOne({ employeeCode: updateFields.employeeCode, _id: { $ne: employeeId } });
        if (existingEmployeeByCode) {
            return res.status(409).json({ message: `An employee with the code '${updateFields.employeeCode}' already exists.` });
        }
    }

    const updatedEmployee = await Employee.findByIdAndUpdate(
      employeeId,
      { $set: updateFields }, // Use $set to only update provided fields
      { new: true, runValidators: true }
    );

    res.json(updatedEmployee);
  } catch (error) {
    console.error("[employeeController.updateEmployee] Error updating employee:", error);
    if (error.code === 11000) {
        let field = Object.keys(error.keyValue)[0];
        field = field === 'employeeCode' ? 'Employee Code' : field.charAt(0).toUpperCase() + field.slice(1);
        return res.status(409).json({ message: `${field} '${error.keyValue[Object.keys(error.keyValue)[0]]}' already exists.` });
    }
    if (error.name === 'ValidationError') {
        return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: "Server error while updating employee." });
  }
};

// @desc    Delete an employee
// @route   DELETE /api/employees/:id
// @access  Private (Employer only)
export const deleteEmployee = async (req, res) => {
  // Middleware 'protect' and 'employerOnly' already ensure req.user is an employer
  const employeeId = req.params.id;
  if (!mongoose.Types.ObjectId.isValid(employeeId)) {
    return res.status(400).json({ message: "Invalid Employee ID format." });
  }

  let session; // Declare session outside try so it's accessible in finally
  try {
    session = await mongoose.startSession();
    session.startTransaction();
    console.log(`[employeeController.deleteEmployee] Starting transaction for employee ${employeeId}`);

    const employeeToDelete = await Employee.findOne({ _id: employeeId, employerId: req.user.id }).session(session);

    if (!employeeToDelete) {
      await session.abortTransaction();
      session.endSession(); // End session after abort
      return res.status(404).json({ message: "Employee not found or not associated with this employer." });
    }

    // Remove employee from any assigned Roles (Business logic specific to employee deletion)
    await Role.updateMany(
      { assignedEmployees: employeeId },
      { $pull: { assignedEmployees: employeeId } },
      { session }
    );
    console.log(`[employeeController.deleteEmployee] Removed employee ${employeeId} from assigned roles.`);

    // Store userId before deleting employee, to delete the associated User account
    const userIdToDelete = employeeToDelete.userId;

    // 2. Explicitly delete Timesheets, VehicleReviews, and Schedules for this employee
    // await Timesheet.deleteMany({ employeeId: employeeToDelete._id }, { session });
    // console.log(`[employeeController.deleteEmployee] Commented out: Deleting Timesheets for employee ${employeeToDelete._id}.`);
    
    // await VehicleReview.deleteMany({ employeeId: employeeToDelete._id }, { session });
    // console.log(`[employeeController.deleteEmployee] Commented out: Deleting VehicleReviews for employee ${employeeToDelete._id}.`);
    
    // await Schedule.deleteMany({ employee: employeeToDelete._id }, { session });
    // console.log(`[employeeController.deleteEmployee] Commented out: Deleting Schedules for employee ${employeeToDelete._id}.`);

    // 3. Delete the Employee record itself
    await Employee.findByIdAndDelete(employeeToDelete._id, { session });
    console.log(`[employeeController.deleteEmployee] Deleted employee record ${employeeToDelete._id}.`);

    // 4. Now, delete the associated User account if a userId was linked
    if (userIdToDelete) {
      const userAccountToDelete = await User.findById(userIdToDelete).session(session);
      if (userAccountToDelete) {
        // Using findByIdAndDelete as pre('remove') hooks are no longer used for this cascade.
        await User.findByIdAndDelete(userAccountToDelete._id, { session });
        console.log(`[employeeController.deleteEmployee] Deleted associated User account ${userIdToDelete}.`);
      } else {
        console.warn(`[employeeController.deleteEmployee] No User account found for userId ${userIdToDelete} to delete.`);
      }
    } else {
      console.log(`[employeeController.deleteEmployee] No userId linked to employee ${employeeId}, skipping User account deletion.`);
    }
    
    await session.commitTransaction();
    console.log(`[employeeController.deleteEmployee] Transaction committed for employee ${employeeId}.`);
    res.json({ message: "Employee and all associated data deleted successfully." });

  } catch (error) {
    // Check if session exists and is in transaction before trying to abort
    if (session && session.inTransaction()) {
      await session.abortTransaction();
      console.log(`[employeeController.deleteEmployee] Transaction aborted for employee ${employeeId} due to error.`);
    }
    console.error("[employeeController.deleteEmployee] Error deleting employee:", error);
    res.status(500).json({ message: "Server error during employee deletion process.", error: error.message });
  } finally {
    if (session) {
      session.endSession();
      console.log(`[employeeController.deleteEmployee] Session ended for employee ${employeeId}.`);
    }
  }
};