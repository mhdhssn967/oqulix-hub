import { initializeApp } from "firebase/app";
import { getFirestore, collection, doc, writeBatch, Timestamp } from "firebase/firestore";
import dotenv from 'dotenv';

dotenv.config();

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const companyId = 'SbHx5KAgBiXpEYIFyT4ht53alFz1';

const records = [
  // March 2025 - August 2025: 10,000
  { month: '2025-03', salary: 10000 },
  { month: '2025-04', salary: 10000 },
  { month: '2025-05', salary: 10000 },
  { month: '2025-06', salary: 10000 },
  { month: '2025-07', salary: 10000 },
  { month: '2025-08', salary: 10000 },
  // September 2025 - July 2026: 25,000
  { month: '2025-09', salary: 25000 },
  { month: '2025-10', salary: 25000 },
  { month: '2025-11', salary: 25000 },
  { month: '2025-12', salary: 25000 },
  { month: '2026-01', salary: 25000 },
  { month: '2026-02', salary: 25000 },
  { month: '2026-03', salary: 25000 },
  { month: '2026-04', salary: 25000 },
  { month: '2026-05', salary: 25000 },
  { month: '2026-06', salary: 25000 },
  { month: '2026-07', salary: 25000 }
];

async function uploadData() {
  try {
    const batch = writeBatch(db);
    const payrollRef = collection(db, `userData/${companyId}/payrollLogs`);

    records.forEach((record) => {
      const newDocRef = doc(payrollRef); // Auto-generate ID
      
      // Calculate a pseudo-processed date (e.g., 1st of the next month)
      const [year, month] = record.month.split('-');
      const processedDate = new Date(parseInt(year), parseInt(month), 1);

      batch.set(newDocRef, {
        employeeId: 'pG7q6woyZENF0M8Om54oZOXcuLB2',
        employeeName: 'Mohammed Hussain A',
        role: 'CTO',
        month: record.month,
        baseSalary: record.salary,
        bonus: 0,
        incentives: 0,
        deductions: 0,
        netSalary: record.salary,
        status: 'Paid',
        processedDate: Timestamp.fromDate(processedDate)
      });
    });

    await batch.commit();
    console.log(`Successfully uploaded ${records.length} payroll records for Mohammed Hussain A.`);
    process.exit(0);
  } catch (error) {
    console.error("Error uploading payroll data:", error);
    process.exit(1);
  }
}

uploadData();
