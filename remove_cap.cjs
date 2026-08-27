const fs = require('fs');

const files = [
  'src/pages/Payroll/PayrollManagement.jsx',
  'src/pages/Payroll/EmployeePayrollAdminView.jsx',
  'src/pages/Payroll/EmployeePayroll.jsx'
];

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  // Remove the cap line
  content = content.replace(/\s*if\s*\(\s*calculated\s*>\s*fullSalary\s*\)\s*calculated\s*=\s*fullSalary;/g, '');
  fs.writeFileSync(file, content);
}
console.log("Caps removed!");
