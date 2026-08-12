/**
 * Calculates the total gross salary based on basic salary and allowances.
 * @param {number} basic 
 * @param {Object} allowances - Key-value pair of allowance names and amounts
 * @returns {number}
 */
export const calculateGrossSalary = (basic = 0, allowances = {}) => {
  const totalAllowances = Object.values(allowances).reduce((sum, val) => sum + (Number(val) || 0), 0);
  return Number(basic) + totalAllowances;
};

/**
 * Calculates total deductions based on the deductions object.
 * @param {Object} deductions - Key-value pair of deduction names and amounts
 * @returns {number}
 */
export const calculateTotalDeductions = (deductions = {}) => {
  return Object.values(deductions).reduce((sum, val) => sum + (Number(val) || 0), 0);
};

/**
 * Calculates the Loss of Pay (LOP) amount.
 * @param {number} grossSalary 
 * @param {number} totalWorkingDays 
 * @param {number} absentDays 
 * @returns {number}
 */
export const calculateLOP = (grossSalary = 0, totalWorkingDays = 0, absentDays = 0) => {
  if (totalWorkingDays <= 0 || absentDays <= 0) return 0;
  const perDayRate = grossSalary / totalWorkingDays;
  return Number((perDayRate * absentDays).toFixed(2));
};

/**
 * Calculates the final Net Payable amount.
 * @param {number} grossSalary 
 * @param {number} lopAmount 
 * @param {number} totalDeductions 
 * @param {number} additionalBonuses 
 * @returns {number}
 */
export const calculateNetPayable = (grossSalary = 0, lopAmount = 0, totalDeductions = 0, additionalBonuses = 0) => {
  const net = (grossSalary - lopAmount - totalDeductions + additionalBonuses);
  return Number(Math.max(0, net).toFixed(2));
};
