import fs from 'fs';
import crypto from 'crypto';

const lines = fs.readFileSync('migrateData.txt', 'utf-8').split('\n').map(l => l.trim());

const leads = [];
let currentLead = null;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  if (!line) continue;

  // New entry trigger: standalone number/index, or 'Name', or a standalone phone number without 'No:'
  if (line.match(/^(\d+|\(\d+\))$/) || line.toLowerCase().startsWith('name') || (line.match(/^\+?\d[\d\s-]{9,}$/) && !line.toLowerCase().startsWith('no:'))) {
    if (currentLead && Object.keys(currentLead).length > 0) {
      if (currentLead.contactNo || currentLead.name) {
        // Avoid duplicate push if we matched 'Name' right after an index
        if (!leads.includes(currentLead)) {
            leads.push(currentLead);
        }
      }
    }
    
    // Create new only if it's an index or standalone phone number. If it's 'Name', and we just created one from index, don't recreate.
    if (line.toLowerCase().startsWith('name') && currentLead && !currentLead.name && !currentLead.contactNo) {
        // keep current
    } else {
        currentLead = {
          name: '',
          region: '',
          contactNo: '',
          message: ''
        };
    }
  }
  
  if (!currentLead) currentLead = { name: '', region: '', contactNo: '', message: '' };

  if (line.toLowerCase().startsWith('name')) {
    currentLead.name = line.replace(/^Name[\s:-]*/i, '').trim();
  } else if (line.toLowerCase().startsWith('loc') || line.toLowerCase().startsWith('location')) {
    currentLead.region = line.replace(/^Loc(?:ation)?[\s:-]*/i, '').trim();
  } else if (line.toLowerCase().startsWith('no')) {
    currentLead.contactNo = line.replace(/^No[\s:-]*/i, '').trim();
  } else if (line.toLowerCase().startsWith('business')) {
    currentLead.message = line.trim();
  } else if (line.match(/^\+?\d[\d\s-]{9,}$/)) {
    if (!currentLead.contactNo) currentLead.contactNo = line.trim();
  } else if (!line.match(/^(\d+|\(\d+\))$/) && !line.includes('numbers)')) {
    // If it's a continuation of region or name
    if (currentLead.region && !currentLead.contactNo) {
        currentLead.region += ' ' + line;
    }
  }
}
if (currentLead && (currentLead.contactNo || currentLead.name)) {
  if (!leads.includes(currentLead)) {
    leads.push(currentLead);
  }
}

// Clean and map
const finalData = leads.map(lead => {
  return {
    addedByName: "Muhammed Suhail",
    assignedToName: "Navaneeth K N",
    assignedToUid: "TGCUg8xyPlSWiXKML8M5A7xwuB82",
    contactNo: lead.contactNo || "",
    contactNumber: lead.contactNo || "",
    createdAt: { seconds: Math.floor(Date.now() / 1000) },
    currentStatus: "Contacted",
    date: "2026-07-13",
    employeeName: "Muhammed Suhail",
    followUpDate: "",
    id: crypto.randomBytes(10).toString('hex'),
    institutionName: "",
    lastContacted: "2026-07-13",
    leadType: "Distributor",
    message: lead.message || "",
    name: lead.name || "Unknown",
    newLead: true,
    priority: "Medium",
    region: lead.region || "",
    remarks: "",
    updatedAt: { seconds: Math.floor(Date.now() / 1000) },
    userId: "TGCUg8xyPlSWiXKML8M5A7xwuB82"
  };
});

fs.writeFileSync('adLeads_import.json', JSON.stringify(finalData, null, 2));
console.log('Successfully generated adLeads_import.json with ' + finalData.length + ' records.');
