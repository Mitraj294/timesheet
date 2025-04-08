import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useParams, useNavigate } from "react-router-dom";
import { getEmployees, updateEmployee } from "../../redux/actions/employeeActions";
import "../../styles/EditEmployee.scss";

const EditEmployee = () => {
  const { id } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  
  const { employees } = useSelector((state) => state.employees);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    employeeCode: "",
    expectedHours: "",
    wage: "",
    isAdmin: false,
    overtime: false,
    holidayMultiplier: "",
  });

  useEffect(() => {
    dispatch(getEmployees());
  }, [dispatch]);

  useEffect(() => {
    const emp = employees.find((e) => e._id === id);
    if (emp) {
      setFormData({
        name: emp.name,
        email: emp.email,
        employeeCode: emp.employeeCode,
        expectedHours: emp.expectedHours,
        wage: emp.wage,
        isAdmin: emp.isAdmin,
        overtime: emp.overtime,
        holidayMultiplier: emp.holidayMultiplier || "", 
      });
    }
  }, [id, employees]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === "checkbox" ? checked : value, 
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    dispatch(updateEmployee(id, formData));
    navigate("/employees"); // Redirect back to employees list
  };

  return (
    <div className="edit-employee-container">
      <h2>Edit Employee</h2>
      <form onSubmit={handleSubmit}>
        <input type="text" name="name" placeholder="Name" value={formData.name} onChange={handleChange} required />
        <input type="email" name="email" placeholder="Email" value={formData.email} onChange={handleChange} required />
        <input type="text" name="employeeCode" placeholder="Employee Code" value={formData.employeeCode} onChange={handleChange} required />
        <input type="number" name="expectedHours" placeholder="Expected Hours" value={formData.expectedHours} onChange={handleChange} required />
        <input type="number" name="wage" placeholder="Wage ($/hr)" value={formData.wage} onChange={handleChange} required />

        {/* Admin Checkbox */}
        <label className="checkbox-label">
          <input type="checkbox" name="isAdmin" checked={formData.isAdmin} onChange={handleChange} />
          Admin
        </label>

        {/* Overtime Checkbox */}
        <label className="checkbox-label">
          <input type="checkbox" name="overtime" checked={formData.overtime} onChange={handleChange} />
          Overtime Allowed
        </label>

        {/* Holiday Multiplier */}
        <input type="number" name="holidayMultiplier" placeholder="Holiday Multiplier" value={formData.holidayMultiplier} onChange={handleChange} required />

        <button type="submit">Update Employee</button>
      </form>
    </div>
  );
};

export default EditEmployee;
