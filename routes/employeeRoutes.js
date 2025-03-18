import express from "express";
import Employee from "../models/Employee.js";

const router = express.Router();

//  Create a new employee
router.post("/", async (req, res) => {
  const { name, email, role, department } = req.body;
  try {
    const newEmployee = new Employee({ name, email, role, department });
    await newEmployee.save();
    res.json(newEmployee);
  } catch (err) {
    res.status(500).json({ error: "Server Error" });
  }
});

// Get all employees
router.get("/", async (req, res) => {
  try {
    const employees = await Employee.find();
    res.json(employees);
  } catch (err) {
    res.status(500).json({ error: "Server Error" });
  }
});

//  Update an employee
router.put("/:id", async (req, res) => {
  try {
    const updatedEmployee = await Employee.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    res.json(updatedEmployee);
  } catch (err) {
    res.status(500).json({ error: "Server Error" });
  }
});

// Delete an employee
router.delete("/:id", async (req, res) => {
  try {
    await Employee.findByIdAndDelete(req.params.id);
    res.json({ msg: "Employee deleted" });
  } catch (err) {
    res.status(500).json({ error: "Server Error" });
  }
});

export default router;
