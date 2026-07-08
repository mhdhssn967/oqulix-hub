import fs from 'fs';

const pages = ["Dashboard", "Finance", "Tasks", "Attendance", "Performance", "Clients", "Analysis", "Documents", "OtherData", "Settings"];

pages.forEach(page => {
  const content = `import React from 'react';

export default function ${page}() {
  return (
    <div>
      <header className="mb-10">
        <h1 className="text-3xl font-semibold text-black tracking-tight">${page}</h1>
        <p className="text-[15px] text-zinc-500 mt-1.5">Manage your ${page} here.</p>
      </header>
      <div className="bg-white p-12 rounded-2xl border border-zinc-200/80 shadow-[0_2px_8px_rgba(0,0,0,0.02)] flex items-center justify-center text-zinc-400">
        ${page} module coming soon.
      </div>
    </div>
  );
}
`;
  fs.writeFileSync(`src/pages/${page}.jsx`, content);
});

console.log('Pages generated successfully.');
