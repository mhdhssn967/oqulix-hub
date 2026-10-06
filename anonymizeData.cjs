const fs = require('fs');

try {
  const rawData = JSON.parse(fs.readFileSync('mockData_full.json', 'utf8'));

  const randomString = (len) => Math.random().toString(36).substring(2, 2 + len);
  const randomNum = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
  const mockNames = ['Alice', 'Bob', 'Charlie', 'Diana', 'Eve', 'Frank', 'Grace', 'Heidi', 'Ivan', 'Judy'];
  const mockLastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis'];
  const mockCompanies = ['Acme Corp', 'Globex', 'Soylent Corp', 'Initech', 'Umbrella Corp'];

  const getName = () => `${mockNames[randomNum(0, mockNames.length - 1)]} ${mockLastNames[randomNum(0, mockLastNames.length - 1)]}`;
  const getEmail = (name) => `${name.replace(' ', '.').toLowerCase()}@example.com`;
  
  let nameMap = {};
  
  // Roles are kept intact
  if (rawData.roles) {
    // nothing to anonymize in roles, just keep them.
  }

  // Anonymize User Data
  if (rawData.userData) {
    for (const userId in rawData.userData) {
      const uData = rawData.userData[userId];
      
      // Employees
      if (uData.employees) {
        uData.employees.forEach(emp => {
          emp.name = getName();
          if (emp.email) emp.email = getEmail(emp.name);
          if (emp.phone) emp.phone = `+1555${randomNum(100000, 999999)}`;
          if (emp.address) emp.address = `${randomNum(100, 999)} Fake St, Mock City`;
          if (emp.panNumber) emp.panNumber = `ABCD${randomNum(1000, 9999)}E`;
          if (emp.bankAccount) emp.bankAccount = `${randomNum(1000000000, 9999999999)}`;
          if (emp.ifscCode) emp.ifscCode = `MOCK000${randomNum(1000, 9999)}`;
        });
      }
      
      // Clients
      if (uData.clients) {
        uData.clients.forEach(client => {
          client.name = getName();
          client.email = getEmail(client.name);
          if (client.companyName) client.companyName = mockCompanies[randomNum(0, mockCompanies.length - 1)];
          if (client.phone) client.phone = `+1555${randomNum(100000, 999999)}`;
        });
      }
      
      // Tasks (can just leave titles but maybe anonymize descriptions)
      if (uData.tasks) {
        uData.tasks.forEach(task => {
          if (task.description) task.description = 'Mocked task description...';
        });
      }
    }
  }

  fs.writeFileSync('demo_data.json', JSON.stringify(rawData, null, 2));
  console.log('Successfully generated demo_data.json');
} catch (e) {
  console.error('Error generating demo data:', e.message);
}
