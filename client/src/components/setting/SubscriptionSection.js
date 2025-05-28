import React, { useState, useEffect, useMemo } from 'react';
import '../../styles/SubscriptionSection.scss';

const SubscriptionSection = () => {
  // State for monthly/yearly toggle
  const [isMonthly, setIsMonthly] = useState(true);
  // State for selected plan ID (e.g., 'small_monthly')
  const [selectedPlanId, setSelectedPlanId] = useState(null);
  // State for the number of employees, defaults to 1
  const [numberOfEmployees, setNumberOfEmployees] = useState(1);
  // State to toggle visibility of subscription details
  const [showSubscriptionDetails, setShowSubscriptionDetails] = useState(false);

  // Define our plans; use useMemo to ensure they don't recreate on every render
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

  // Determine which set of plans (monthly or yearly) is active
  const currentPlans = useMemo(() => isMonthly ? plans.monthly : plans.yearly, [isMonthly, plans]);

  // Effect: Adjust initial employee count when billing interval changes
  useEffect(() => {
    const defaultPlan = currentPlans[0];
    if (defaultPlan) {
      let initialCount = 1; // Default for 'Small'
      if (defaultPlan.name === 'Medium') {
        initialCount = 11;
      } else if (defaultPlan.name === 'Large') {
        initialCount = 26;
      }
      setNumberOfEmployees(initialCount);
    } else {
      setNumberOfEmployees(1); // Fallback if no plans
    }
  }, [isMonthly, currentPlans]);

  // Effect: Auto-select a plan based on employee count or when plans change
  useEffect(() => {
    const count = numberOfEmployees;
    let newSelectedPlan = null;

    // Find the right plan for the current employee count
    for (const plan of currentPlans) {
      if (count <= plan.limit) {
        newSelectedPlan = plan;
        break;
      }
    }

    // If no specific match (e.g., count is very high), default to the largest plan
    if (!newSelectedPlan && currentPlans.length > 0) {
      newSelectedPlan = currentPlans[currentPlans.length - 1];
    }

    // Update selected plan if it's different
    if (newSelectedPlan && selectedPlanId !== newSelectedPlan.id) {
      setSelectedPlanId(newSelectedPlan.id);
    } else if (!newSelectedPlan && currentPlans.length > 0 && selectedPlanId !== currentPlans[0].id) {
      // Fallback to the first plan if no match and currently nothing is selected
      setSelectedPlanId(currentPlans[0].id);
    } else if (!newSelectedPlan && selectedPlanId !== null) {
      // Clear selection if no plans are available
      setSelectedPlanId(null);
    }
  }, [numberOfEmployees, currentPlans, selectedPlanId]); // 'selectedPlanId' here helps prevent unnecessary re-renders if it's already the correct plan

  // Handler for when a user clicks on a plan card
  const handlePlanSelect = (planId) => {
    const chosenPlan = currentPlans.find(p => p.id === planId);
    if (chosenPlan) {
      setSelectedPlanId(chosenPlan.id); // Set the plan ID first

      // Adjust employee count to a sensible default for the chosen plan
      let newEmployeeCount = numberOfEmployees;
      const smallLimit = currentPlans.find(p => p.name === 'Small')?.limit || 10;
      const mediumLimit = currentPlans.find(p => p.name === 'Medium')?.limit || 25;

      if (chosenPlan.name === 'Small') {
        if (numberOfEmployees > chosenPlan.limit) newEmployeeCount = chosenPlan.limit;
        else if (numberOfEmployees === 0) newEmployeeCount = 1; // Smallest active count
      } else if (chosenPlan.name === 'Medium') {
        if (numberOfEmployees > chosenPlan.limit) newEmployeeCount = chosenPlan.limit;
        else if (numberOfEmployees <= smallLimit) newEmployeeCount = smallLimit + 1; // Minimum for Medium
      } else if (chosenPlan.name === 'Large') {
        if (numberOfEmployees <= mediumLimit) newEmployeeCount = mediumLimit + 1; // Minimum for Large
      }

      // Only update if the count has actually changed
      if (newEmployeeCount !== numberOfEmployees) {
        setNumberOfEmployees(newEmployeeCount);
      }
    }
  };

  // Get details of the currently active plan
  const activePlanDetails = useMemo(() => {
    // If no plan is explicitly selected but we have plans, default to the first one
    if (!selectedPlanId && currentPlans.length > 0) {
      return currentPlans[0];
    }
    return currentPlans.find(p => p.id === selectedPlanId) || null;
  }, [selectedPlanId, currentPlans]);

  // Calculate the total amount
  const calculateTotal = () => {
    if (!activePlanDetails) return 0;
    const pricePerEmployee = activePlanDetails.price;
    // Ensure we calculate for at least 1 employee if it's a paid plan
    const effectiveEmployees = (pricePerEmployee > 0 && numberOfEmployees < 1) ? 1 : numberOfEmployees;
    return pricePerEmployee * effectiveEmployees;
  };

  const totalAmount = calculateTotal();
  const totalDisplay = isMonthly ? `$${totalAmount.toFixed(2)} / month` : `$${(totalAmount * 12).toFixed(2)} / year`;

  // Handle changes in the employee count input
  const handleEmployeeCountChange = (e) => {
    const count = Math.max(0, parseInt(e.target.value, 10) || 0); // Ensure non-negative number
    setNumberOfEmployees(count);
    // The useEffect for `numberOfEmployees` will handle re-selecting the plan
  };

  // Handle toggling between monthly and yearly billing
  const handleBillingIntervalChange = (monthly) => {
    setIsMonthly(monthly);
    // The `currentPlans` useEffect will then adjust the selected plan automatically
  };

  // Render a simple button to show details if not already visible
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

  // Main subscription view
  return (
    <div className="section-container">
      <div className="grid">
        {/* Left Column: Plan Selection */}
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
              <a
                className={`plan-card ${selectedPlanId === plan.id ? 'active' : ''}`}
                onClick={() => handlePlanSelect(plan.id)}
                role="button"
                tabIndex={0}
                onKeyPress={(e) => e.key === 'Enter' && handlePlanSelect(plan.id)}
              >
                <div className="plan-name">{plan.name}</div>
                <div className="plan-desc">{plan.desc}</div>
                <div className="plan-price">${plan.price} / employee</div>
              </a>
            </div>
          ))}
        </div>

        {/* Right Column: Employee Count, Payment, and Summary */}
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
              // Disable if count is 0 and plan is paid (implies you must have at least 1 for a paid plan)
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
              className="btn btn-success"
              // Add actual disable logic based on form validity/Stripe readiness
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