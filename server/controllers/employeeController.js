import Employee from "../models/Employee.js";
import Timesheet from "../models/Timesheet.js";
import VehicleReview from "../models/VehicleReview.js";
import Schedule from "../models/Schedule.js";
import Role from "../models/Role.js";
import User from "../models/User.js"; // For optional User deletion
import mongoose from "mongoose"; // For transactions

// @desc    Get all employees
// @route   GET /api/employees
// @access  Private (Or Public, depending on your app's requirements)
export const getEmployees = async (req, res) => {
  // req.user should be populated by your `protect` middleware
  if (!req.user) {
    return res.status(401).json({ message: "Not authorized, no user" });
  }

  try {
    let employees;
    if (req.user.role === 'employer') {
      // Employer gets all employees under their employerId
      employees = await Employee.find({ employerId: req.user.id });
    } else if (req.user.role === 'employee') {
      // Employee gets their own employee record by matching their userId
      const employeeRecord = await Employee.findOne({ userId: req.user.id })
        .populate('employerId', 'name email companyName phoneNumber country'); // Populate employer details
      employees = employeeRecord ? [employeeRecord] : [];
    } else {
      // For any other roles, or if the role is not 'employer' or 'employee'
      return res.status(403).json({ message: "Access denied for this role." });
    }
    res.json(employees);
  } catch (error) {
    console.error("Error fetching employees:", error);
    res.status(500).json({ message: "Error fetching employees" });
  }
};

// @desc    Add a new employee
// @route   POST /api/employees
// @access  Private (Typically admin/employer role)
export const addEmployee = async (req, res) => {

  try {
    const { name, email, employeeCode, wage, isAdmin, overtime, expectedHours, holidayMultiplier, userId } = req.body;
    
    if (!name || !email || !employeeCode || !wage) {
      return res.status(400).json({ message: "Name, Email, Employee Code, and Wage are required" });
    }

    // Basic email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: "Please provide a valid email address." });
    }

    const numericWage = Number(wage);
    if (isNaN(numericWage) || numericWage <= 0) {
      return res.status(400).json({ message: "Wage must be a positive number." });
    }

    // Check for global uniqueness of email and employeeCode as per schema
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
      expectedHours: expectedHours ?? 40, // Use schema default if not provided or null
      holidayMultiplier: holidayMultiplier ?? 1.5, // Use schema default if not provided or null
      userId: userId || null, // Link to the employee's User document, if provided
      employerId: req.user.id // Link to the employer's User document
    });

    await newEmployee.save();
    res.status(201).json(newEmployee);
  } catch (error) {
    console.error("Error adding employee:", error);
    if (error.code === 11000) { // MongoDB duplicate key error
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
// @access  Private (Typically admin/employer role)
export const updateEmployee = async (req, res) => {
  if (!req.user || req.user.role !== 'employer') {
    return res.status(401).json({ message: "Not authorized or not an employer" });
  }
  try {
    const employeeId = req.params.id;
    const { name, email, employeeCode, wage, isAdmin, overtime, expectedHours, holidayMultiplier } = req.body;

    // Prepare update object with only the fields intended for update
    const updateFields = {};
    if (name) updateFields.name = name;
    if (email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ message: "Please provide a valid email address." });
        }
        updateFields.email = email;
    }
    if (employeeCode) {
        // If employeeCode is being changed, ensure it's unique among other employees
        // We need to fetch the employee first to compare against its current code if it's being changed.
        // This check will be done after fetching the employee.
        updateFields.employeeCode = employeeCode;
    }

    if (wage !== undefined) {
        const numericWage = Number(wage);
        if (isNaN(numericWage) || numericWage <= 0) {
            return res.status(400).json({ message: "Wage must be a positive number." });
        }
        updateFields.wage = numericWage;
    }
    if (isAdmin !== undefined) updateFields.isAdmin = isAdmin;
    if (overtime !== undefined) updateFields.overtime = overtime;
    if (expectedHours !== undefined) {
        const numExpectedHours = Number(expectedHours);
        updateFields.expectedHours = isNaN(numExpectedHours) ? undefined : numExpectedHours; // Let Mongoose handle default if NaN
    }
    if (holidayMultiplier !== undefined) {
        const numHolidayMultiplier = Number(holidayMultiplier);
        updateFields.holidayMultiplier = isNaN(numHolidayMultiplier) ? undefined : numHolidayMultiplier; // Let Mongoose handle default if NaN
    }
    // Note: userId is typically not updated. If it needs to be, handle with care.
    // employerId should generally not be updatable by an employer directly on an existing employee.

    // Ensure the employer can only update their own employees
    const employee = await Employee.findOne({ _id: employeeId, employerId: req.user.id });
    if (!employee) {
      return res.status(404).json({ message: "Employee not found or not associated with this employer" });
    }

    // If email is being changed, ensure it's unique among other employees
    if (updateFields.email && updateFields.email !== employee.email) {
        const existingEmployeeByEmail = await Employee.findOne({ email: updateFields.email, _id: { $ne: employeeId } });
        if (existingEmployeeByEmail) {
            return res.status(409).json({ message: `An employee with the email '${updateFields.email}' already exists.` });
        }
    }
    // If employeeCode is being changed, ensure it's unique among other employees
    if (updateFields.employeeCode && updateFields.employeeCode !== employee.employeeCode) {
        const existingEmployeeByCode = await Employee.findOne({ employeeCode: updateFields.employeeCode, _id: { $ne: employeeId } });
        if (existingEmployeeByCode) {
            return res.status(409).json({ message: `An employee with the code '${updateFields.employeeCode}' already exists.` });
        }
    }

    const updatedEmployee = await Employee.findByIdAndUpdate(
      employeeId,
      updateFields,
      { new: true, runValidators: true } // Returns updated document and runs schema validators
    );

    res.json(updatedEmployee);
  } catch (error) {
    console.error("Error updating employee:", error);
    if (error.code === 11000) { // MongoDB duplicate key error
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
// @access  Private (Typically admin/employer role)
export const deleteEmployee = async (req, res) => {
  if (!req.user || req.user.role !== 'employer') {
    return res.status(401).json({ message: "Not authorized or not an employer" });
  }

  const employeeId = req.params.id;
  if (!mongoose.Types.ObjectId.isValid(employeeId)) {
    return res.status(400).json({ message: "Invalid Employee ID format." });
  }

  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    // 1. Find the employee to ensure they exist and belong to the employer
    const employeeToDelete = await Employee.findOne({ _id: employeeId, employerId: req.user.id }).session(session);

    if (!employeeToDelete) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ message: "Employee not found or not associated with this employer." });
    }

    // The Employee model's pre('remove') hook will now handle deletion of:
    // - Timesheets
    // - VehicleReviews
    // - Schedules
    // So, explicit deletion of these from the controller is no longer needed if using employeeToDelete.remove().

    // Remove employee from any assigned Roles (This is specific business logic, keep in controller)
    await Role.updateMany(
      { assignedEmployees: employeeId },
      { $pull: { assignedEmployees: employeeId } },
      { session }
    );
    console.log(`[employeeController] Removed employee ${employeeId} from assigned roles`);

    // 6. (CRITICAL CONSIDERATION) Delete the associated User record for the employee
    // This is a destructive action. Uncomment and test thoroughly if this is desired.
    // if (employeeToDelete.userId) {
    //   const userAccountToDelete = await User.findById(employeeToDelete.userId).session(session);
    //   if (userAccountToDelete) {
    //     await userAccountToDelete.remove({ session }); // This will trigger User's pre('remove') hook
    //     console.log(`[employeeController] Initiated deletion of user account ${employeeToDelete.userId} associated with employee ${employeeId}`);
    //   } else {
    //     console.warn(`[employeeController] User account ${employeeToDelete.userId} not found for employee ${employeeId}, cannot delete.`);
    //   }
    //   await User.findByIdAndDelete(employeeToDelete.userId, { session });
    //   console.log(`Deleted user account ${employeeToDelete.userId} associated with employee ${employeeId}`);
    // }

    // 7. Delete the Employee document itself
    await Employee.findByIdAndDelete(employeeId, { session });
    console.log(`Deleted employee ${employeeId}`);

    await session.commitTransaction();
    session.endSession();

    res.json({ message: "Employee deleted successfully" });

  } catch (error) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    session.endSession();
    console.error("Error deleting employee:", error);
    res.status(500).json({ message: "Server error during employee deletion process.", error: error.message });
  }
};
