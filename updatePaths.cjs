const fs = require('fs');
const path = require('path');

function updateFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Replace references
  content = content.replace(/'segments',\s*activeSegment,\s*'crmData'/g, "'crm'");
  content = content.replace(/'segments',\s*'General',\s*'crmData'/g, "'crm'");
  content = content.replace(/segments\/\${activeSegment}\/crmData/g, "crm");
  content = content.replace(/segments\/\${col\.segment}\/crmData/g, "crm");
  
  fs.writeFileSync(filePath, content);
  console.log(`Updated paths in ${filePath}`);
}

updateFile(path.join(__dirname, 'src', 'pages', 'CRM.jsx'));
updateFile(path.join(__dirname, 'src', 'pages', 'Analysis.jsx'));
