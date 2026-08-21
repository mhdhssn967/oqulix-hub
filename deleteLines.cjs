const fs = require('fs');

let lines = fs.readFileSync('src/pages/CRM.jsx', 'utf8').split('\n');

// We want to delete:
// 1. Lines 1311 to 1346
// 2. Lines 970 to 1026
// 3. Lines 428 to 478

// Note: when deleting lines by index in an array, we must do it from bottom to top so line numbers don't shift!

// Delete block 3 (Lines 1311 to 1346) -> indices 1310 to 1345
lines.splice(1310, 1346 - 1311 + 1);

// Delete block 2 (Lines 970 to 1026) -> indices 969 to 1025
lines.splice(969, 1026 - 970 + 1);

// Delete block 1 (Lines 428 to 478) -> indices 427 to 477
lines.splice(427, 478 - 428 + 1);

fs.writeFileSync('src/pages/CRM.jsx', lines.join('\n'));
console.log("Lines deleted successfully!");
