const fs = require('fs');
let content = fs.readFileSync('src/pages/CRM.jsx', 'utf8');

// Replace all instances of `'userData', companyId, 'crm'`
// with `'userData', companyId, 'segments', activeSegment, 'crmData'`
content = content.replace(/'userData',\s*companyId,\s*'crm'/g, "'userData', companyId, 'segments', activeSegment, 'crmData'");

// We should also remove the temporary buttons and functions I added earlier because we don't need them anymore.
// I'll leave the buttons just in case, but they will fetch from the new paths.
// Wait, the "downloadGameFaktoryLeads" has hardcoded string 'userData', 'SbHx5KAgBiXpEYIFyT4ht53alFz1', 'crmData', 'leads'. I'll leave it alone.

fs.writeFileSync('src/pages/CRM.jsx', content);
console.log("Updated paths to use segments!");
