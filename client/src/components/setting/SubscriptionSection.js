import React, { useState, useEffect, useMemo } from 'react';
import '../../styles/SubscriptionSection.scss';

const SubscriptionSection = () => {
  const [isMonthly, setIsMonthly] = useState(true);
  const [selectedPlanId, setSelectedPlanId] = useState(null);
  const [numberOfEmployees, setNumberOfEmployees] = useState(1);
  const [showSubscriptionDetails, setShowSubscriptionDetails] = useState(false);

  // Plans for monthly and yearly
  const plans = useMemo(() => ({
    monthly: [
      { id: 'small_month', name: 'Small', desc: 'For 10 or fewer employees', price: 16, limit: 10 },
      { id: 'medium_month', name: 'Medium', desc: 'For 25 or fewer employees', price: 14, limit: 25 },
      { id: 'large_month', name: 'Large', desc: 'For more than 25 employees', price: 12, limit: Infinity },
    ],
    yearly: [
      { id: 'small_year', name: 'Small', desc: 'For 10 or fewer employees', price: 15, limit: 10 },
      { id: 'medium_year', name: 'Medium', desc: 'For 25 or fewer employees', price: 13, limit: 25 },
      { id: 'large_year', name: 'Large', desc: 'For more than 25 employees', price: 11, limit: Infinity },
    ],
  }), []);

  const currentPlans = useMemo(() => isMonthly ? plans.monthly : plans.yearly, [isMonthly, plans]);

  // Set default employee count when billing interval changes
  useEffect(() => {
    setNumberOfEmployees(1);
  }, [isMonthly]);

  // Auto-select plan based on employee count
  useEffect(() => {
    let plan = currentPlans.find(p => numberOfEmployees <= p.limit) || currentPlans[currentPlans.length - 1];
    if (plan && selectedPlanId !== plan.id) setSelectedPlanId(plan.id);
  }, [numberOfEmployees, currentPlans, selectedPlanId]);

  // When user clicks a plan
  const handlePlanSelect = (planId) => {
    setSelectedPlanId(planId);
    const plan = currentPlans.find(p => p.id === planId);
    if (plan && numberOfEmployees > plan.limit) setNumberOfEmployees(plan.limit);
    if (plan && plan.name === 'Medium' && numberOfEmployees <= 10) setNumberOfEmployees(11);
    if (plan && plan.name === 'Large' && numberOfEmployees <= 25) setNumberOfEmployees(26);
  };

  const activePlanDetails = useMemo(() => {
    return currentPlans.find(p => p.id === selectedPlanId) || currentPlans[0];
  }, [selectedPlanId, currentPlans]);

  // Calculate total price
  const totalAmount = (activePlanDetails?.price || 0) * numberOfEmployees;
  const totalDisplay = isMonthly
    ? `$${totalAmount.toFixed(2)} / month`
    : `$${(totalAmount * 12).toFixed(2)} / year`;

  // Handle employee count input
  const handleEmployeeCountChange = (e) => {
    setNumberOfEmployees(Math.max(0, parseInt(e.target.value, 10) || 0));
  };

  // Toggle monthly/yearly
  const handleBillingIntervalChange = (monthly) => setIsMonthly(monthly);

  if (!showSubscriptionDetails) {
    return (
      <div className="section-container center">
        <div className="card">
          <h5 className="card-title">Manage Your Subscription</h5>
          <p className="card-desc">
            View and update your current subscription plan, billing details, and more.
          </p>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setShowSubscriptionDetails(true)}
          >
            Click Here to View Subscription Options
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="section-container">
      <div className="grid">
        {/* Plan Selection */}
        <div className="card">
          <h5 className="card-title">Choose Your Subscription Plan</h5>
          <div className="interval-toggle">
            <button
              type="button"
              className={`toggle-btn ${isMonthly ? 'active' : ''}`}
              onClick={() => handleBillingIntervalChange(true)}
            >
              Monthly Packages
            </button>
            <button
              type="button"
              className={`toggle-btn ${!isMonthly ? 'active' : ''}`}
              onClick={() => handleBillingIntervalChange(false)}
            >
              Yearly Packages
            </button>
          </div>
          {currentPlans.map(plan => (
            <div className="plan-item" key={plan.id}>
              <button
                type="button"
                className={`plan-card ${selectedPlanId === plan.id ? 'active' : ''}`}
                onClick={() => handlePlanSelect(plan.id)}
                onKeyDown={(e) => e.key === 'Enter' && handlePlanSelect(plan.id)}
              >
                <div className="plan-name">{plan.name}</div>
                <div className="plan-desc">{plan.desc}</div>
                <div className="plan-price">${plan.price} / employee</div>
              </button>
            </div>
          ))}
        </div>
        {/* Employee Count and Summary */}
        <div>
          <div className="card">
            <label htmlFor="employeeCount" className="input-label">
              Number of Employees
            </label>
            <input
              type="number"
              className="input-field"
              id="employeeCount"
              name="employeeCount"
              autoComplete="off"
              value={numberOfEmployees}
              onChange={handleEmployeeCountChange}
              min="0"
              disabled={numberOfEmployees <= 0 && activePlanDetails?.price > 0}
            />
            <p className="stripe-label">Credit/Debit Card</p>
            <div className="stripe-placeholder">
              Card Element Placeholder
            </div>
          </div>
          <div className="card">
            <h5 className="card-title">Summary</h5>
            <div className="summary-row">
              <p className="summary-label">Plan Name</p>
              <p className="summary-value">
                {activePlanDetails?.name || 'N/A'} ({isMonthly ? 'Monthly' : 'Yearly'})
              </p>
            </div>
            <div className="summary-row">
              <p className="summary-label">Price per Employee</p>
              <p className="summary-value">
                ${activePlanDetails?.price !== undefined ? activePlanDetails.price.toFixed(2) : '0.00'} / employee
              </p>
            </div>
            <div className="summary-row">
              <p className="summary-label">Quantity</p>
              <p className="summary-value">{numberOfEmployees}</p>
            </div>
            <div className="summary-row total-row">
              <p className="summary-total-label">Total (NZD)</p>
              <p className="summary-total-value">{totalDisplay}</p>
            </div>
            <button
              type="button"
              className="btn btn-green"
            >
              Complete Payment
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionSection;