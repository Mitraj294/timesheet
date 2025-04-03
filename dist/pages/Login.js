import React from 'react';

const Login = () => {
  return (
    <div className="styles_LoginSignupContainer">
      <div className="styles_Card_styles_Login_">
        <div className="styles_Login_header">
          <h2>Login to TimeSheet</h2>
        </div>
        <div className="styles_Login_content">
          <form>
            <div className="styles_Login_content_input input_Input_container">
              <input type="email" placeholder="Email Address" required />
            </div>
            <div className="styles_Login_content_input input_Input_container">
              <input type="password" placeholder="Password" required />
            </div>
            <button type="submit" className="styles_Button_primary">
              Sign In
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
