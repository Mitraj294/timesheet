import React, { useState, useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { register, login, clearAuthError, checkProspectiveEmployee, selectProspectiveEmployeeCheck, clearProspectiveEmployeeCheck, requestCompanyInvitation } from "../../redux/slices/authSlice";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEye, faEyeSlash, faUser, faEnvelope, faUserPlus, faSignInAlt, faGlobe, faPhone, faBuilding, faLock, faArrowLeft } from "@fortawesome/free-solid-svg-icons";
import { isValidPhoneNumber, getCountries, getCountryCallingCode } from 'libphonenumber-js';
import { setAlert } from "../../redux/slices/alertSlice";
import "../../styles/Register.scss";
import Alert from "../layout/Alert";

const Register = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, error: authApiError, loading } = useSelector((state) => state.auth);
  const prospectiveEmployeeCheck = useSelector(selectProspectiveEmployeeCheck);
  const { email: initialEmail, name: initialName } = location.state || {};

  // Form state
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: initialName || "",
    email: initialEmail || "",
    password: "",
    role: "",
    country: "",
    phoneNumber: "",
    companyName: "",
  });
  const [invitationFormData, setInvitationFormData] = useState({
    prospectiveEmployeeName: initialName || "",
    prospectiveEmployeeEmail: initialEmail || "",
    companyName: "",
    companyEmail: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState("");
  const [countryCode, setCountryCode] = useState('IN');
  const [isSubmittingInvitation, setIsSubmittingInvitation] = useState(false);

  // Clear errors on mount/unmount
  useEffect(() => {
    console.log("[Register] Component mounted");
    dispatch(clearAuthError());
    dispatch(clearProspectiveEmployeeCheck());
    return () => { 
      dispatch(clearAuthError());
      console.log("[Register] Component unmounted");
    };
  }, [dispatch]);

  // Redirect if registered
  useEffect(() => {
    if (isAuthenticated) {
      console.log("[Register] User is authenticated, navigating to dashboard");
      navigate("/dashboard");
    }
  }, [isAuthenticated, navigate]);

  // Show alerts for errors
  useEffect(() => {
    if (authApiError) {
      console.log("[Register] Auth API error:", authApiError);
      dispatch(setAlert(authApiError, 'danger'));
    }
  }, [authApiError, dispatch]);

  // Show alerts for employee check
  useEffect(() => {
    if (prospectiveEmployeeCheck.status === 'succeeded' && prospectiveEmployeeCheck.result && !prospectiveEmployeeCheck.result.canProceed) {
      console.log("[Register] Prospective employee check: cannot proceed", prospectiveEmployeeCheck.result.message);
      dispatch(setAlert(prospectiveEmployeeCheck.result.message, 'warning'));
    } else if (prospectiveEmployeeCheck.status === 'failed' && prospectiveEmployeeCheck.error) {
      const errorMessage = typeof prospectiveEmployeeCheck.error === 'string' ? prospectiveEmployeeCheck.error : prospectiveEmployeeCheck.error?.message || 'Failed to verify email.';
      console.log("[Register] Prospective employee check failed:", errorMessage);
      dispatch(setAlert(errorMessage, 'danger'));
    }
  }, [prospectiveEmployeeCheck, dispatch]);

  // Handle form field changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    console.log(`[Register] Changed ${name}:`, value);
    if (name === 'role' && step === 1 && value) {
      setStep(2);
      console.log("[Register] Role selected:", value, "Moving to step 2");
      if (value === 'employee') {
        setInvitationFormData(prev => ({
          ...prev,
          prospectiveEmployeeName: formData.name || initialName || "",
          prospectiveEmployeeEmail: formData.email || initialEmail || "",
        }));
      }
    }
  };

  // Go back to role selection
  const handleBack = () => {
    setStep(1);
    setFormData(prev => ({ ...prev, role: '' }));
    console.log("[Register] Back to step 1 (role selection)");
  };

  // Register employer
  const handleSubmit = async (e) => {
    e.preventDefault();
    const { email, password, role } = formData;
    dispatch(clearAuthError());
    console.log("[Register] Submitting registration for:", email, "as", role);
    if (role === 'employer' && password !== confirmPassword) {
      dispatch(setAlert('Passwords do not match', 'danger'));
      console.log("[Register] Passwords do not match");
      return;
    }
    if (role === 'employer' && formData.phoneNumber) {
      try {
        if (!isValidPhoneNumber(formData.phoneNumber, countryCode)) {
          dispatch(setAlert(`Please enter a valid phone number for the selected country (${countryCode}).`, 'warning'));
          console.log("[Register] Invalid phone number:", formData.phoneNumber, countryCode);
          return;
        }
      } catch (e) {
        dispatch(setAlert("Invalid phone number format.", 'warning'));
        console.log("[Register] Invalid phone number format");
        return;
      }
    }
    try {
      await dispatch(register(formData)).unwrap();
      console.log("[Register] Registration successful");
      dispatch(setAlert('Registration successful!', 'success'));
      try {
        await dispatch(login({ email, password })).unwrap();
        console.log("[Register] Auto-login successful");
        dispatch(setAlert('Login successful!', 'success'));
      } catch (loginError) {
        console.log("[Register] Auto-login failed:", loginError);
        dispatch(setAlert(loginError || 'Automatic login failed. Please log in manually.', 'warning'));
        navigate('/login', { state: { email } });
      }
    } catch (registerError) {
      console.log("[Register] Registration failed:", registerError);
      dispatch(setAlert('Registration failed. Please try again.', 'danger'));
    }
  };

  // Handle employee invitation form changes
  const handleInvitationChange = (e) => {
    const { name, value } = e.target;
    setInvitationFormData({ ...invitationFormData, [name]: value });
    console.log(`[Register] Invitation form changed ${name}:`, value);
  };

  // Check if employee email is already used
  const handleProspectiveEmailBlur = () => {
    if (formData.role === 'employee' && invitationFormData.prospectiveEmployeeEmail) {
      if (!/\S+@\S+\.\S+/.test(invitationFormData.prospectiveEmployeeEmail)) {
        dispatch(setAlert('Invalid email format.', 'warning'));
        dispatch(clearProspectiveEmployeeCheck());
        console.log("[Register] Invalid prospective employee email format");
        return;
      }
      console.log("[Register] Checking prospective employee email:", invitationFormData.prospectiveEmployeeEmail);
      dispatch(checkProspectiveEmployee({ email: invitationFormData.prospectiveEmployeeEmail }));
    } else {
      dispatch(clearProspectiveEmployeeCheck());
    }
  };

  // Submit invitation to join as employee
  const handleInvitationSubmit = async (e) => {
    e.preventDefault();
    dispatch(clearAuthError());
    setIsSubmittingInvitation(true);
    console.log("[Register] Submitting invitation request:", invitationFormData);
    try {
      if (prospectiveEmployeeCheck.result && !prospectiveEmployeeCheck.result.canProceed) {
        dispatch(setAlert(prospectiveEmployeeCheck.result.message || "Cannot proceed with this email. It's already associated with an active employee.", 'warning'));
        setIsSubmittingInvitation(false);
        console.log("[Register] Cannot proceed with invitation:", prospectiveEmployeeCheck.result.message);
        return;
      }
      await dispatch(requestCompanyInvitation(invitationFormData)).unwrap();
      setInvitationFormData({ prospectiveEmployeeName: "", prospectiveEmployeeEmail: "", companyName: "", companyEmail: "" });
      setStep(1);
      console.log("[Register] Invitation request sent successfully");
    } catch (error) {
      console.log("[Register] Invitation request failed:", error);
      // Error alert handled by thunk
    } finally {
      setIsSubmittingInvitation(false);
    }
  };

  // Country select options
  const countryOptions = useMemo(() => {
    const countries = getCountries();
    return countries.map(country => ({
      value: country,
      label: `+${getCountryCallingCode(country)} (${country})`
    })).sort((a, b) => a.label.localeCompare(b.label));
  }, []);

  // Render
  return (
    <div className="styles_LoginSignupContainer">
      <Alert />
      <div className="styles_Card">
        <div className="styles_Login_header">
          <img src="/img/download.png" alt="App Logo" className="styles_LoginLogo" />
        </div>
        <hr className="styles_Separator" />
        <h5 className="styles_FormHeader">Sign Up with TimeSheet</h5>
        <hr className="styles_Separator" />
        {step === 1 && (
          <div className="styles_LoginForm">
            <div className="styles_InputGroup styles_RoleSelection">
              <label htmlFor="role">Select Your Role to Continue</label>
              <div className="styles_InputWithIcon">
                <select id="role" name="role" value={formData.role} onChange={handleChange} disabled={loading}>
                  <option value="" disabled>Select Role...</option>
                  <option value="employee">👤 Employee</option>
                  <option value="employer">🏢 Employer</option>
                </select>
              </div>
            </div>
          </div>
        )}
        {step === 2 && (
          <>
            {formData.role === 'employer' && (
              <form onSubmit={handleSubmit} className="styles_LoginForm">
                <button type="button" onClick={handleBack} className="styles_BackButton" disabled={loading}>
                  <FontAwesomeIcon icon={faArrowLeft} /> Back
                </button>
                <p className="styles_SelectedRole">
                  Registering as: <strong>🏢 Employer</strong>
                </p>
                <div className="styles_InputGroup">
                  <label htmlFor="name">Full Name*</label>
                  <div className="styles_InputWithIcon">
                    <input id="name" type="text" name="name" placeholder="Your Full Name" value={formData.name} onChange={handleChange} required disabled={loading} />
                    <FontAwesomeIcon icon={faUser} className="styles_InputIcon styles_InputIconRight" />
                  </div>
                </div>
                <div className="styles_InputGroup">
                  <label htmlFor="email">Email Address*</label>
                  <div className="styles_InputWithIcon">
                    <input id="email" type="email" name="email" placeholder="you@example.com" value={formData.email} onChange={handleChange} required disabled={loading} />
                    <FontAwesomeIcon icon={faEnvelope} className="styles_InputIcon styles_InputIconRight" />
                  </div>
                </div>
                <>
                  <div className="styles_InputGroup">
                    <label htmlFor="country">Country</label>
                    <div className="styles_InputWithIcon">
                      <input id="country" type="text" name="country" placeholder="Your Country" value={formData.country} onChange={handleChange} disabled={loading} />
                      <FontAwesomeIcon icon={faGlobe} className="styles_InputIcon styles_InputIconRight" />
                    </div>
                  </div>
                  <div className="styles_InputGroup">
                    <label htmlFor="phoneNumber">Phone Number</label>
                    <div className="styles_InputWithIcon">
                    <div className="phone-input-group">
                       <select
                          name="countryCode"
                          value={countryCode}
                          onChange={(e) => setCountryCode(e.target.value)}
                          className="country-code-select"
                          disabled={loading}
                          aria-label="Country Code"
                        >
                          {countryOptions.map(option => (
                            <option key={option.value} value={option.value}>{option.label}</option>
                          ))}
                        </select>
                      <input id="phoneNumber" type="tel" name="phoneNumber" placeholder="Enter phone number" value={formData.phoneNumber} onChange={handleChange} disabled={loading} />
                    </div>
                      <FontAwesomeIcon icon={faPhone} className="styles_InputIcon styles_InputIconRight" />
                    </div>
                  </div>
                  <div className="styles_InputGroup">
                    <label htmlFor="companyName">Company Name*</label>
                    <div className="styles_InputWithIcon">
                      <input id="companyName" type="text" name="companyName" placeholder="Your Company Name" value={formData.companyName} onChange={handleChange} required disabled={loading} />
                      <FontAwesomeIcon icon={faBuilding} className="styles_InputIcon styles_InputIconRight" />
                    </div>
                  </div>
                </>
                <div className="styles_InputGroup">
                  <label htmlFor="password">Password*</label>
                  <div className="styles_PasswordInputContainer">
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      name="password"
                      placeholder="Password (min. 6 characters)"
                      value={formData.password}
                      onChange={handleChange}
                      required
                      minLength="6"
                      disabled={loading}
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="styles_PasswordToggleBtn" disabled={loading}>
                      <FontAwesomeIcon icon={faEyeSlash} className="styles_InputIcon styles_InputIconRight" />
                    </button>
                  </div>
                </div>
                <div className="styles_InputGroup">
                  <label htmlFor="confirmPassword">Confirm Password*</label>
                  <div className="styles_PasswordInputContainer">
                    <input
                      id="confirmPassword"
                      type={showPassword ? "text" : "password"}
                      name="confirmPassword"
                      placeholder="Confirm Your Password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      minLength="6"
                      disabled={loading}
                    />
                     <FontAwesomeIcon icon={faLock} className="styles_InputIcon styles_InputIconRight" />
                  </div>
                </div>
                <button type="submit" className="styles_Button" disabled={loading}>
                  {loading ? "Signing Up..." : <><FontAwesomeIcon icon={faUserPlus} className="button-icon" /> Sign Up</>}
                </button>
              </form>
            )}
            {formData.role === 'employee' && (
              <form onSubmit={handleInvitationSubmit} className="styles_LoginForm">
                 <button type="button" onClick={handleBack} className="styles_BackButton" disabled={isSubmittingInvitation}>
                  <FontAwesomeIcon icon={faArrowLeft} /> Back
                </button>
                <p className="styles_SelectedRole">
                  Request to Join a Company as: <strong>👤 Employee</strong>
                </p>
                <div className="styles_InputGroup">
                  <label htmlFor="prospectiveEmployeeName">Full Name*</label>
                  <div className="styles_InputWithIcon">
                    <input id="prospectiveEmployeeName" type="text" name="prospectiveEmployeeName" placeholder="Your Full Name" value={invitationFormData.prospectiveEmployeeName} onChange={handleInvitationChange} required disabled={isSubmittingInvitation} />
                    <FontAwesomeIcon icon={faUser} className="styles_InputIcon styles_InputIconRight" />
                  </div>
                </div>
                <div className="styles_InputGroup">
                  <label htmlFor="prospectiveEmployeeEmail">Email Address*</label>
                  <div className="styles_InputWithIcon">
                    <input id="prospectiveEmployeeEmail" type="email" name="prospectiveEmployeeEmail" placeholder="Your Email Address" value={invitationFormData.prospectiveEmployeeEmail} onChange={handleInvitationChange} onBlur={handleProspectiveEmailBlur} required disabled={isSubmittingInvitation || prospectiveEmployeeCheck.status === 'loading'} />
                    <FontAwesomeIcon icon={faEnvelope} className="styles_InputIcon styles_InputIconRight" />
                  </div>
                </div>
                <div className="styles_InputGroup">
                  <label htmlFor="targetCompanyName">Company Name*</label>
                  <div className="styles_InputWithIcon">
                    <input id="targetCompanyName" type="text" name="companyName" placeholder="Company You Want to Join" value={invitationFormData.companyName} onChange={handleInvitationChange} required disabled={isSubmittingInvitation} />
                    <FontAwesomeIcon icon={faBuilding} className="styles_InputIcon styles_InputIconRight" />
                  </div>
                </div>
                <div className="styles_InputGroup">
                  <label htmlFor="targetCompanyEmail">Company Email Address*</label>
                  <div className="styles_InputWithIcon">
                    <input id="targetCompanyEmail" type="email" name="companyEmail" placeholder="Employer's Email Address" value={invitationFormData.companyEmail} onChange={handleInvitationChange} required disabled={isSubmittingInvitation} />
                    <FontAwesomeIcon icon={faEnvelope} className="styles_InputIcon styles_InputIconRight" />
                  </div>
                </div>
                {prospectiveEmployeeCheck.status === 'loading' && <p className="styles_InfoText">Checking email...</p>}
                <button 
                  type="submit" 
                  className="styles_Button" 
                  disabled={isSubmittingInvitation || prospectiveEmployeeCheck.status === 'loading' || (prospectiveEmployeeCheck.result && !prospectiveEmployeeCheck.result.canProceed)}
                >
                  {isSubmittingInvitation ? "Sending Request..." : 
                   (prospectiveEmployeeCheck.status === 'loading' ? "Verifying..." : <><FontAwesomeIcon icon={faUserPlus} className="button-icon" /> Send Request</>)}
                </button>
              </form>
            )}
          </>
        )}
        <p className="styles_SignupPrompt">
          Already have an account?
          <button
            className="styles_SignupButton"
            onClick={() => navigate("/login", { state: { email: formData.email } })}
            disabled={loading}
          > 
            <FontAwesomeIcon icon={faSignInAlt} className="button-icon" /> Sign In
          </button>
        </p>
      </div>
    </div>
  );
};

export default Register;
