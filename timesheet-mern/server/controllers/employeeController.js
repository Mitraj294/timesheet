import Employee from "../models/Employee.js";

// Get all employees
export const getEmployees = async (req, res) => {
  try {
    const employees = await Employee.find();
    res.json(employees);
  } catch (error) {
    console.error("Error fetching employees:", error);
    res.status(500).json({ error: "Server error" });
  }
};

// Add a new employee
export const addEmployee = async (req, res) => {
  try {
    console.log("Received Employee Data:", req.body); // Debugging
    console.log("Type of wage:", typeof req.body.wage);
    console.log("Type of employeeCode:", typeof req.body.employeeCode);

    const { name, email, role, department, employeeCode, wage } = req.body;

    if (!name || !email || !employeeCode || !wage) {
      return res.status(400).json({ error: "All fields are required" });
    }

    const newEmployee = new Employee({
      name,
      email,
      role,
      department,
      employeeCode,
      wage: Number(wage), // Convert wage to number
    });

    await newEmployee.save();
    res.status(201).json(newEmployee);
  } catch (error) {
    console.error("Error adding employee:", error);
    res.status(500).json({ error: "Server error" });
  }
};


// Update an employee
export const updateEmployee = async (req, res) => {
  try {
    const updatedEmployee = await Employee.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true } // Returns updated document
    );

    if (!updatedEmployee) {
      return res.status(404).json({ error: "Employee not found" });
    }

    res.json(updatedEmployee);
  } catch (error) {
    console.error("Error updating employee:", error);
    res.status(500).json({ error: "Server error" });
  }
};

// Delete an employee
export const deleteEmployee = async (req, res) => {
  try {
    const deletedEmployee = await Employee.findByIdAndDelete(req.params.id);
    if (!deletedEmployee) {
      return res.status(404).json({ error: "Employee not found" });
    }
    res.json({ message: "Employee deleted successfully" });
  } catch (error) {
    console.error("Error deleting employee:", error);
    res.status(500).json({ error: "Server error" });
  }
};


