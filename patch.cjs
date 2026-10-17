const fs = require('fs');
const p = 'src/pages/Analysis.jsx';
let c = fs.readFileSync(p, 'utf8');

const importTarget = `import { useAuthStore } from '../store/authStore';`;
const importReplacement = `import { useAuthStore } from '../store/authStore';
import { crmCache } from '../store/crmCache';`;

const fetchTarget = `  useEffect(() => {
    const fetchData = async () => {
      if (!companyId) return;
      setLoading(true);
      try {
        const [lSnap, aSnap, dSnap] = await Promise.all([
          getDocs(collection(db, 'userData', companyId, 'segments', activeSegment, 'crmData', 'leads', 'items')),
          getDocs(collection(db, 'userData', companyId, 'segments', activeSegment, 'crmData', 'adLeads', 'items')),
          getDocs(collection(db, 'userData', companyId, 'segments', activeSegment, 'crmData', 'distributors', 'items'))
        ]);`;

const fetchReplacement = `  useEffect(() => {
    const fetchData = async () => {
      if (!companyId) return;

      const filterData = (items) => {
        if (!items) return [];
        if (isAdmin || isManager || isHR) return items;
        return items.filter(i => 
          i.userId === user?.uid || 
          i.assignedToUid === user?.uid || 
          i.employeeUid === user?.uid || 
          i.addedBy === user?.uid
        );
      };

      if (crmCache.data && crmCache.activeSegment === activeSegment && Date.now() - crmCache.timestamp < 5 * 60 * 1000) {
        setRegularLeads(filterData(crmCache.data.fetchedLeads));
        setAdLeads(filterData(crmCache.data.fetchedAdLeads));
        setDistributors(filterData(crmCache.data.fetchedDistributors));
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const [lSnap, aSnap, dSnap] = await Promise.all([
          getDocs(collection(db, 'userData', companyId, 'segments', activeSegment, 'crmData', 'leads', 'items')),
          getDocs(collection(db, 'userData', companyId, 'segments', activeSegment, 'crmData', 'adLeads', 'items')),
          getDocs(collection(db, 'userData', companyId, 'segments', activeSegment, 'crmData', 'distributors', 'items'))
        ]);`;

c = c.replace(importTarget, importReplacement);
c = c.replace(fetchTarget, fetchReplacement);

// Handle CRLF if needed
const importTargetCRLF = importTarget.replace(/\n/g, '\r\n');
const importReplacementCRLF = importReplacement.replace(/\n/g, '\r\n');
const fetchTargetCRLF = fetchTarget.replace(/\n/g, '\r\n');
const fetchReplacementCRLF = fetchReplacement.replace(/\n/g, '\r\n');

if (c.indexOf(importReplacement) === -1) {
    c = c.replace(importTargetCRLF, importReplacementCRLF);
}
if (c.indexOf(fetchReplacement) === -1) {
    c = c.replace(fetchTargetCRLF, fetchReplacementCRLF);
}

fs.writeFileSync(p, c);
