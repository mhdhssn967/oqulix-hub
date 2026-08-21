const fs = require('fs');

let crmContent = fs.readFileSync('src/pages/CRM.jsx', 'utf8');

const originalBlock = `        {/* Ad Leads View */}
        {activeTab === 'ads' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[900px]">
              <thead>
                <tr className="border-b border-zinc-100 bg-zinc-50/50">
                  <th className="px-5 py-3 text-[12px] font-semibold text-zinc-500 uppercase tracking-wider w-12">#</th>
                  <th className="px-5 py-3 text-[12px] font-semibold text-zinc-500 uppercase tracking-wider">Lead Info</th>
                  <th className="px-5 py-3 text-[12px] font-semibold text-zinc-500 uppercase tracking-wider">Status & Agent</th>
                  <th className="px-5 py-3 text-[12px] font-semibold text-zinc-500 uppercase tracking-wider">Institution & Region</th>
                  <th className="px-5 py-3 text-[12px] font-semibold text-zinc-500 uppercase tracking-wider max-w-xs">Message</th>
                  <th className="px-5 py-3 text-[12px] font-semibold text-zinc-500 uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {filteredAdLeads.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((lead, index) => (
                  <tr key={lead.id} className={\`transition-colors group cursor-pointer \${
                    isMissedFollowUp(lead) ? 'bg-red-50/40 hover:bg-red-100/50' : 
                    (!(lead.statusHistory?.length > 1) && !(lead.history?.length > 1)) ? 'bg-blue-50/80 hover:bg-blue-100/80' : 
                    'hover:bg-zinc-50/50'
                  }\`} onClick={() => { setQuickUpdateLead(lead); setUpdateStatus(lead.currentStatus || 'New Lead'); setUpdateRemarks(''); }}>
                    <td className="px-5 py-4 text-[13px] text-zinc-500 font-medium relative">
                      {isRecentLead(lead) && (
                        <span className="absolute top-0 left-0 bg-emerald-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded-br-md shadow-sm uppercase tracking-wider z-10 leading-none">
                          NEW
                        </span>
                      )}
                      {lead.priority && (
                        <span className={\`absolute bottom-0 left-0 text-white text-[9px] font-black px-1.5 py-0.5 rounded-tr-md shadow-sm uppercase tracking-wider z-10 leading-none \${
                          lead.priority === 'High' || lead.priority === 'Urgent' ? 'bg-red-500' :
                          lead.priority === 'Medium' ? 'bg-orange-500' :
                          'bg-green-500'
                        }\`}>
                          {lead.priority}
                        </span>
                      )}
                      {(currentPage - 1) * itemsPerPage + index + 1}
                    </td>
                    <td className="px-5 py-4">
                      <div className="font-semibold text-black text-[14px] flex items-center gap-2">
                        <User className="w-4 h-4 text-zinc-400" />
                        {lead.name}
                      </div>
                      <div className="text-[12px] text-zinc-500 mt-1 flex items-center gap-1">
                        <Phone className="w-3 h-3" /> 
                        <span>{lead.contactNumber}</span>
                        {lead.contactNumber && (
                          <div className="flex items-center gap-0.5 ml-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                navigator.clipboard.writeText(lead.contactNumber);
                                Swal.fire({ title: 'Copied!', text: 'Phone number copied to clipboard', icon: 'success', timer: 1000, showConfirmButton: false });
                              }}
                              className="p-1 hover:bg-zinc-200 rounded text-zinc-400 hover:text-black transition-colors"
                              title="Copy Number"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                            <a
                              href={\`https://wa.me/\${(lead.contactNumber || '').replace(/[^0-9]/g, '')}\`}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="p-1 hover:bg-green-100 rounded text-zinc-400 hover:text-[#25D366] transition-colors"
                              title="Chat on WhatsApp"
                            >
                              <MessageSquare className="w-3.5 h-3.5" />
                            </a>
                          </div>
                        )}
                      </div>
                      {lead.remarks && (
                        <div className="mt-1.5 text-[11px] text-zinc-500 bg-zinc-50 px-2 py-1 rounded border border-zinc-100 max-w-[200px] line-clamp-2" title={lead.remarks}>
                          {lead.remarks}
                        </div>
                      )}
                      {isMissedFollowUp(lead) && (
                        <div className="mt-1.5 flex items-center gap-2">
                          <span className="text-[10px] text-red-600 font-bold uppercase tracking-wider">Missed Follow-up</span>
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <span className={\`inline-flex items-center px-2 py-0.5 rounded-md text-[12px] font-medium ring-1 ring-inset \${getStatusColor(lead.currentStatus)}\`}>
                        {lead.currentStatus}
                      </span>
                      <div className="text-[12px] text-zinc-500 mt-1">
                        Rep: <span className="font-medium text-zinc-700">{lead.assignedToName}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="text-[13px] font-medium text-zinc-900">{lead.institutionName}</div>
                      <div className="text-[12px] text-zinc-500 mt-1 flex items-center gap-1">
                        <MapPin className="w-3 h-3" /> {lead.region}
                      </div>
                    </td>
                    <td className="px-5 py-4 max-w-xs">
                      <p className="text-[12px] text-zinc-600 line-clamp-2" title={lead.message}>
                        "{lead.message}"
                      </p>
                    </td>`;

const newBlock = `        {/* Ad Leads View */}
        {activeTab === 'ads' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[320px] sm:min-w-[700px]">
              <thead>
                <tr className="border-b border-zinc-100 bg-zinc-50/50">
                  <th className="p-3 sm:p-4 text-[11px] font-semibold text-zinc-500 uppercase tracking-wider w-8 sm:w-12 text-center">#</th>
                  <th className="p-3 sm:p-4 text-[11px] font-semibold text-zinc-500 uppercase tracking-wider w-[120px] sm:w-[220px]">Lead Info</th>
                  <th className="p-3 sm:p-4 text-[11px] font-semibold text-zinc-500 uppercase tracking-wider w-[120px] sm:w-[180px]">Status</th>
                  <th className="hidden sm:table-cell p-3 sm:p-4 text-[11px] font-semibold text-zinc-500 uppercase tracking-wider w-[120px]">Associate</th>
                  <th className="hidden md:table-cell p-3 sm:p-4 text-[11px] font-semibold text-zinc-500 uppercase tracking-wider max-w-[150px]">Message</th>
                  <th className="p-3 sm:p-4 text-[11px] font-semibold text-zinc-500 uppercase tracking-wider text-right w-16 sm:w-24">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {filteredAdLeads.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((lead, index) => (
                  <tr key={lead.id} className={\`transition-colors group cursor-pointer \${
                    isMissedFollowUp(lead) ? 'bg-red-50/40 hover:bg-red-100/50' : 
                    (!(lead.statusHistory?.length > 1) && !(lead.history?.length > 1)) ? 'bg-blue-50/80 hover:bg-blue-100/80' : 
                    'hover:bg-zinc-50/50'
                  }\`} onClick={() => { setQuickUpdateLead(lead); setUpdateStatus(lead.currentStatus || 'New Lead'); setUpdateRemarks(''); }}>
                    <td className="p-3 sm:p-4 text-[11px] sm:text-[13px] text-zinc-500 font-medium relative text-center">
                      {isRecentLead(lead) && (
                        <span className="absolute top-0 left-0 bg-emerald-600 text-white text-[8px] sm:text-[9px] font-black px-1 sm:px-1.5 py-0.5 rounded-br-md shadow-sm uppercase tracking-wider z-10 leading-none">
                          NEW
                        </span>
                      )}
                      {lead.priority && (
                        <span className={\`absolute bottom-0 left-0 text-white text-[8px] sm:text-[9px] font-black px-1 sm:px-1.5 py-0.5 rounded-tr-md shadow-sm uppercase tracking-wider z-10 leading-none \${
                          lead.priority === 'High' || lead.priority === 'Urgent' ? 'bg-red-500' :
                          lead.priority === 'Medium' ? 'bg-orange-500' :
                          'bg-green-500'
                        }\`}>
                          {lead.priority}
                        </span>
                      )}
                      {(currentPage - 1) * itemsPerPage + index + 1}
                    </td>
                    <td className="p-3 sm:p-4">
                      <div className="font-semibold text-black text-[12px] sm:text-[14px] flex items-center gap-1 sm:gap-2 truncate">
                        <User className="w-3 h-3 sm:w-4 sm:h-4 text-zinc-400 shrink-0" />
                        <span className="truncate">{lead.name}</span>
                      </div>
                      <div className="text-[11px] sm:text-[12px] text-zinc-500 mt-1 flex items-center gap-1 truncate">
                        <Phone className="w-2.5 h-2.5 sm:w-3 sm:h-3 shrink-0" /> 
                        <span className="truncate">{lead.contactNumber}</span>
                        {lead.contactNumber && (
                          <div className="flex items-center gap-0.5 ml-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity shrink-0">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                navigator.clipboard.writeText(lead.contactNumber);
                                Swal.fire({ title: 'Copied!', text: 'Phone number copied to clipboard', icon: 'success', timer: 1000, showConfirmButton: false });
                              }}
                              className="p-1 hover:bg-zinc-200 rounded text-zinc-400 hover:text-black transition-colors"
                              title="Copy Number"
                            >
                              <Copy className="w-3 h-3" />
                            </button>
                            <a
                              href={\`https://wa.me/\${(lead.contactNumber || '').replace(/[^0-9]/g, '')}\`}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="p-1 hover:bg-green-100 rounded text-zinc-400 hover:text-[#25D366] transition-colors"
                              title="Chat on WhatsApp"
                            >
                              <MessageSquare className="w-3 h-3" />
                            </a>
                          </div>
                        )}
                      </div>
                      {lead.remarks && (
                        <div className="mt-1.5 text-[10px] sm:text-[11px] text-zinc-500 bg-zinc-50 px-1.5 py-1 rounded border border-zinc-100 max-w-[130px] sm:max-w-[200px] line-clamp-2" title={lead.remarks}>
                          {lead.remarks}
                        </div>
                      )}
                      {isMissedFollowUp(lead) && (
                        <div className="mt-1.5 flex items-center gap-2">
                          <span className="text-[9px] sm:text-[10px] text-red-600 font-bold uppercase tracking-wider">Missed Follow-up</span>
                        </div>
                      )}
                    </td>
                    <td className="p-3 sm:p-4">
                      <span className={\`inline-flex items-center px-1.5 sm:px-2 py-0.5 rounded-md text-[10px] sm:text-[12px] font-medium ring-1 ring-inset \${getStatusColor(lead.currentStatus)}\`}>
                        {lead.currentStatus}
                      </span>
                      <div className="text-[11px] sm:text-[12px] font-medium text-zinc-900 mt-1.5 truncate max-w-[130px] sm:max-w-[180px]">
                        {lead.institutionName || 'No Institution'}
                      </div>
                      <div className="text-[10px] sm:text-[11px] text-zinc-500 mt-0.5 flex items-center gap-1 truncate max-w-[130px] sm:max-w-[180px]">
                        <MapPin className="w-3 h-3 shrink-0" /> <span className="truncate">{lead.region || 'No Region'}</span>
                      </div>
                    </td>
                    <td className="hidden sm:table-cell p-3 sm:p-4">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-zinc-100 flex items-center justify-center shrink-0">
                          <User className="w-3 h-3 text-zinc-500" />
                        </div>
                        <div className="text-[12px] font-medium text-zinc-700 truncate max-w-[100px]">
                          {lead.assignedToName || 'Unassigned'}
                        </div>
                      </div>
                    </td>
                    <td className="hidden md:table-cell p-3 sm:p-4 max-w-xs">
                      <p className="text-[11px] sm:text-[12px] text-zinc-600 line-clamp-2" title={lead.message}>
                        "{lead.message}"
                      </p>
                    </td>`;

if (crmContent.includes(originalBlock)) {
    crmContent = crmContent.replace(originalBlock, newBlock);
    fs.writeFileSync('src/pages/CRM.jsx', crmContent);
    console.log("Successfully replaced AdLeads table logic!");
} else {
    console.log("Could not find the exact originalBlock!");
}
