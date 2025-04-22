import React, { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { connect } from "react-redux";
import { addEmployee, updateEmployee } from "../../redux/actions/employeeActions";
import "../../styles/EmployeeForms.scss";

const API_URL = process.env.REACT_APP_API_URL || 'https://timesheet-c4mj.onrender.com/api';

const EmployeeForm = ({ employees, addEmployee, updateEmployee }) => {
  const { id } = useParams();
  const navigate = useNavigate();
   const initialFormState = {
    name: "",
    employeeCode: "",
    email: "",
    isAdmin: "No",
    overtime: "No",
    expectedHours: 40,
    holidayMultiplier: 1.5,
    wage: "",
  };

  const [formData, setFormData] = useState(initialFormState);

  useEffect(() => {
    if (id) {
      const emp = employees.find((e) => e._id === id);
      if (emp) {
        setFormData({ ...emp, wage: emp.wage.toString() });
      }
    } else {
      setFormData(initialFormState);
    }
  }, [id, employees]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prevState) => ({
      ...prevState,
      [name]: value,
    }));
  };

  
  const handleSubmit = async (e) => {
    e.preventDefault();
  
    if (!formData.name || !formData.email || !formData.employeeCode || !formData.wage) {
      alert("Please fill all required fields.");
      return;
    }
  
    try {
      // Check if the user already exists

      const userCheckResponse = await fetch(`${API_URL}/auth/check-user`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: formData.email }),
      });
      
      const userCheckData = await userCheckResponse.json();
      let employeeData = { ...formData, wage: parseFloat(formData.wage) };
  
      if (!userCheckData.exists) {
        console.log("User not found, registering new employee...");
  
        // Register the employee as a user first
        const registerResponse = await fetch(`${API_URL}/auth/register`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: formData.name,
            email: formData.email,
            password: "123456",
            role: "employee",
          }),
        });
  
        if (!registerResponse.ok) {
          throw new Error("Failed to register employee as a user.");
        }
  
        const registeredUser = await registerResponse.json();
        
        if (!registeredUser.user || !registeredUser.user._id) {
          throw new Error("Invalid response from registration. No user ID received.");
        }
  
        console.log("Employee registered as user:", registeredUser);
        employeeData.userId = registeredUser.user._id; // Link new user to employee
      }
  
      // Add employee record
      if (id) {
        updateEmployee(id, employeeData);
      } else {
        addEmployee(employeeData);
      }
  
      alert("Employee successfully added!");
      navigate("/employees");
    } catch (error) {
      console.error("Error adding employee:", error);
      alert("Error adding employee. Check console for details.");
    }
  };
  
  

  return (
    <div className="employee-form-container">
      <div className="title-breadcrumb">
        <h2 className="page-title">{id ? "Edit Employee" : "Add Employee"}</h2>
        <div className="breadcrumb">
          <Link to="/dashboard" className="breadcrumb-link">Dashboard</Link>
          <span> / </span>
          <Link to="/employees" className="breadcrumb-link">Employees</Link>
          <span> / {id ? "Edit Employee" : "Add Employee"}</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="employee-form">
        <input type="text" name="name" placeholder="Name" value={formData.name} onChange={handleChange} required />
        <input type="text" name="employeeCode" placeholder="Employee Code" value={formData.employeeCode} onChange={handleChange} required />
        <input type="email" name="email" placeholder="Email" value={formData.email} onChange={handleChange} required />

        <label>Admin</label>
        <select name="isAdmin" value={formData.isAdmin} onChange={handleChange} required>
          <option value="Yes">Yes</option>
          <option value="No">No</option>
        </select>

        <label>Overtime Allowed</label>
        <select name="overtime" value={formData.overtime} onChange={handleChange} required>
          <option value="Yes">Yes</option>
          <option value="No">No</option>
        </select>

        <input type="number" name="expectedHours" placeholder="Expected Hours per Week" value={formData.expectedHours} onChange={handleChange} required />
        <input type="number" name="holidayMultiplier" placeholder="Public Holiday Multiplier" value={formData.holidayMultiplier} onChange={handleChange} required />
        <input type="number" name="wage" placeholder="Wage per Hour" value={formData.wage} onChange={handleChange} required />

        <button type="submit">{id ? "Update Employee" : "Add Employee"}</button>
      </form>
    </div>
  );
};

export default connect((state) => ({ employees: state.employees.employees }), { addEmployee, updateEmployee })(EmployeeForm);
