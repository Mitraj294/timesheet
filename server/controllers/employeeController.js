import Employee from "../models/Employee.js";

// @desc    Get all employees
// @route   GET /api/employees
// @access  Private (Or Public, depending on your app's requirements)
export const getEmployees = async (req, res) => {
  try {
    const employees = await Employee.find();
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

    // Optional: Check if employeeCode is unique
    // const existingEmployee = await Employee.findOne({ employeeCode });
    // if (existingEmployee) {
    //   return res.status(400).json({ message: "Employee code already exists." });
    // }

    const newEmployee = new Employee({
      name,
      email,
      employeeCode,
      wage: numericWage,
      isAdmin: isAdmin || false, // Default isAdmin to false if not provided
      overtime: overtime || false, // Default overtime to false
      expectedHours: expectedHours || null, // Default to null or a sensible default
      holidayMultiplier: holidayMultiplier || 1, // Default to 1 or a sensible default
      userId // Save the linked userId (ensure this is intended and secure)
    });

    await newEmployee.save();
    res.status(201).json(newEmployee);
  } catch (error) {
    console.error("Error adding employee:", error);
    res.status(500).json({ message: "Error adding employee" });
  }
};


// @desc    Update an employee's details
// @route   PUT /api/employees/:id
// @access  Private (Typically admin/employer role)
export const updateEmployee = async (req, res) => {
  try {
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
    if (employeeCode) updateFields.employeeCode = employeeCode; // Consider uniqueness check if updatable
    if (wage !== undefined) {
        const numericWage = Number(wage);
        if (isNaN(numericWage) || numericWage <= 0) {
            return res.status(400).json({ message: "Wage must be a positive number." });
        }
        updateFields.wage = numericWage;
    }
    if (isAdmin !== undefined) updateFields.isAdmin = isAdmin;
    if (overtime !== undefined) updateFields.overtime = overtime;
    if (expectedHours !== undefined) updateFields.expectedHours = expectedHours;
    if (holidayMultiplier !== undefined) updateFields.holidayMultiplier = holidayMultiplier;
    // Note: userId is typically not updated. If it needs to be, handle with care.

    const updatedEmployee = await Employee.findByIdAndUpdate(
      req.params.id,
      updateFields,
      { new: true, runValidators: true } // Returns updated document and runs schema validators
    );

    if (!updatedEmployee) {
      return res.status(404).json({ message: "Employee not found" });
    }

    res.json(updatedEmployee);
  } catch (error) {
    console.error("Error updating employee:", error);
    res.status(500).json({ message: "Error updating employee" });
  }
};

// @desc    Delete an employee
// @route   DELETE /api/employees/:id
// @access  Private (Typically admin/employer role)
export const deleteEmployee = async (req, res) => {
  try {
    const deletedEmployee = await Employee.findByIdAndDelete(req.params.id);
    if (!deletedEmployee) {
      return res.status(404).json({ message: "Employee not found" });
    }
    res.json({ message: "Employee deleted successfully" });
  } catch (error) {
    console.error("Error deleting employee:", error);
    res.status(500).json({ message: "Error deleting employee" });
  }
};
