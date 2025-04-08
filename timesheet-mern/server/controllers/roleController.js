import Role from '../models/Role.js';

export const createRole = async (req, res) => {
  try {
    const { roleName, roleDescription, color, assignedEmployees, schedule } = req.body;

    const newRole = new Role({
      roleName,
      roleDescription,
      color,
      assignedEmployees,
      schedule,
    });

    await newRole.save();
    res.status(201).json({ message: 'Role created successfully', role: newRole });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};


// @desc    Get all roles
export const getRoles = async (req, res) => {
  try {
    const roles = await Role.find()
      .populate('assignedEmployees', 'name')
      .sort({ createdAt: -1 });

    res.status(200).json(roles);
  } catch (err) {
    console.error('Get roles error:', err);
    res.status(500).json({ message: 'Server error while fetching roles' });
  }
};
