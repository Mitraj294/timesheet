import User from "../models/User.js";

// Update user profile (name, email, country, phone, company)
export const updateUserProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, email, country, phoneNumber, companyName } = req.body;

    if (!name || !email) {
      return res.status(400).json({ message: "Name and email are required." });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    // If email is changed, check for duplicates
    if (email !== user.email) {
      const emailExists = await User.findOne({ email: email });
      if (emailExists && emailExists._id.toString() !== userId) {
        return res
          .status(400)
          .json({ message: "Email already in use by another account." });
      }
    }

    // Update fields
    user.name = name;
    user.email = email;
    if (country !== undefined) user.country = country;
    if (phoneNumber !== undefined) user.phoneNumber = phoneNumber;
    if (companyName !== undefined && user.role === "employer") {
      user.companyName = companyName;
    }

    const updatedUser = await user.save();

    // Return updated user info (no password/token)
    res.json({
      _id: updatedUser._id,
      name: updatedUser.name,
      email: updatedUser.email,
      role: updatedUser.role,
      country: updatedUser.country,
      phoneNumber: updatedUser.phoneNumber,
      companyName: updatedUser.companyName,
    });
  } catch (error) {
    // Error updating user profile
    res.status(500).json({ message: "Server error during profile update." });
  }
};

const userControllerFactory = (deps) => ({
  updateUserProfile: (req, res) => updateUserProfile(req, res),
  // Add other controller methods as needed
});
export default userControllerFactory;
