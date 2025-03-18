
import React, { useEffect, useState } from "react";
import { connect } from "react-redux";
import { getEmployees, addEmployee, updateEmployee, deleteEmployee } from "../../actions/employeeActions";

const Employees = ({ employees, loading, getEmployees, addEmployee, updateEmployee, deleteEmployee }) => {
  const [formData, setFormData] = useState({ name: "", email: "", role: "", department: "" });

  useEffect(() => {
    getEmployees();
  }, [getEmployees]);

  const handleSubmit = (e) => {
    e.preventDefault();
    addEmployee(formData);
    setFormData({ name: "", email: "", role: "", department: "" });
  };

  return (
    <div>
      <h1>Employees</h1>
      <form onSubmit={handleSubmit}>
        <input type="text" placeholder="Name" onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
        <input type="email" placeholder="Email" onChange={(e) => setFormData({ ...formData, email: e.target.value })} required />
        <input type="text" placeholder="Role" onChange={(e) => setFormData({ ...formData, role: e.target.value })} required />
        <input type="text" placeholder="Department" onChange={(e) => setFormData({ ...formData, department: e.target.value })} required />
        <button type="submit">Add Employee</button>
      </form>
      <ul>
        {employees.map(emp => (
          <li key={emp._id}>
            {emp.name} - {emp.role}
            <button onClick={() => deleteEmployee(emp._id)}>Delete</button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default connect(state => ({ employees: state.employees.employees }), { getEmployees, addEmployee, updateEmployee, deleteEmployee })(Employees);
