const fs = require('fs');

let crm = fs.readFileSync('src/pages/CRM.jsx', 'utf8');

// 1. Remove createImportHandler and related bindings
crm = crm.replace(/\s*const createImportHandler[\s\S]*?const handleImportDistributors = createImportHandler\('distributors'\);\s*/, '\n\n');

// 2. Remove handleMigrateData and handleBackupData
crm = crm.replace(/\s*const handleMigrateData = async \(\) => {[\s\S]*?const handleBackupData = \(\) => {[\s\S]*?setTimeout\(\(\) => backup\(distributors, 'distributors_backup'\), 1000\);\s*};\s*/, '\n\n');

// 3. Remove the UI block completely (the isAdmin && (...) containing those buttons)
// It starts with `{isAdmin && (` and ends with `)}` right before `{/* Status Filter Pills */}`
crm = crm.replace(/\s*\{isAdmin && \(\s*<div className="flex flex-wrap items-center gap-4 mb-6">[\s\S]*?<\/div>\s*\)\}\s*/, '\n\n');

// It could be that the UI block had slightly different classes from my task-1335 output.
// Let's do a more robust regex for the admin buttons block if it has `handleBackupData`
crm = crm.replace(/\s*\{isAdmin && \([\s\S]*?handleBackupData[\s\S]*?<\/div>\s*\)\}\s*/, '\n\n');

// Just in case it was the alternate UI block with `handleImportLeads`
crm = crm.replace(/\s*\{isAdmin && \([\s\S]*?handleImportLeads[\s\S]*?<\/div>\s*\)\}\s*/, '\n\n');

fs.writeFileSync('src/pages/CRM.jsx', crm);
console.log("Cleanup complete!");
