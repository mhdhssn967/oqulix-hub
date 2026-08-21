const fs = require('fs');

const lines = fs.readFileSync('C:\\Users\\huzei\\.gemini\\antigravity-ide\\brain\\8e4bd21c-a4da-4585-9844-c477e574eb90\\.system_generated\\logs\\transcript_full.jsonl', 'utf8').split('\n');
let crmContent = fs.readFileSync('src/pages/CRM.jsx', 'utf8');

let applyCount = 0;

for (let i = 0; i < lines.length; i++) {
  if (!lines[i].trim()) continue;
  try {
    const log = JSON.parse(lines[i]);
    if (log.tool_calls) {
      for (const call of log.tool_calls) {
        if ((call.name === 'default_api:multi_replace_file_content' || call.name === 'default_api:replace_file_content') &&
            call.arguments && call.arguments.TargetFile && call.arguments.TargetFile.includes('CRM.jsx')) {
          
          const desc = call.arguments.Description || '';
          if (desc.includes('buttons') || desc.includes('migrate') || desc.includes('import')) {
             continue;
          }
          
          if (call.name === 'default_api:replace_file_content') {
             const target = call.arguments.TargetContent.replace(/\r\n/g, '\n');
             const replacement = call.arguments.ReplacementContent.replace(/\r\n/g, '\n');
             if (crmContent.includes(target)) {
                 crmContent = crmContent.replace(target, replacement);
                 applyCount++;
             }
          }
          
          if (call.name === 'default_api:multi_replace_file_content') {
             for (const chunk of call.arguments.ReplacementChunks) {
                 const target = chunk.TargetContent.replace(/\r\n/g, '\n');
                 const replacement = chunk.ReplacementContent.replace(/\r\n/g, '\n');
                 if (crmContent.includes(target)) {
                     crmContent = crmContent.replace(target, replacement);
                     applyCount++;
                 }
             }
          }
        }
      }
    }
  } catch(e) {}
}

fs.writeFileSync('src/pages/CRM.jsx', crmContent);
console.log(`Applied ${applyCount} transformations to CRM.jsx`);
