const fs = require('fs');

const lines = fs.readFileSync('C:\\Users\\huzei\\.gemini\\antigravity-ide\\brain\\8e4bd21c-a4da-4585-9844-c477e574eb90\\.system_generated\\logs\\transcript.jsonl', 'utf8').split('\n');

for (let i = lines.length - 1; i >= 0; i--) {
  if (!lines[i].trim()) continue;
  try {
    const log = JSON.parse(lines[i]);
    if (log.tool_calls) {
      for (const call of log.tool_calls) {
        if (call.name === 'default_api:multi_replace_file_content' || call.name === 'default_api:replace_file_content') {
          if (call.arguments && call.arguments.TargetFile && call.arguments.TargetFile.includes('CRM.jsx')) {
            console.log(`Found modification in step ${log.step_index}`);
            fs.writeFileSync('recovered_tool_call.json', JSON.stringify(call.arguments, null, 2));
            process.exit(0);
          }
        }
      }
    }
  } catch(e) {}
}
console.log("No tool calls found for CRM.jsx");
