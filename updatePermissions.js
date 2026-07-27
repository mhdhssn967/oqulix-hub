import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, updateDoc, doc } from "firebase/firestore";
import dotenv from 'dotenv';

dotenv.config();

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
  measurementId: process.env.VITE_FIREBASE_MEASUREMENT_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const allPermissions = [
  "CRM",
  "CRM Analysis",
  "Finance",
  "Clients",
  "Reimbursements",
  "Tasks",
  "Attendance",
  "Employees",
  "Performance",
  "Documents",
  "Settings"
];

const managerPermissions = [
  "CRM",
  "CRM Analysis",
  "Clients",
  "Reimbursements",
  "Tasks",
  "Attendance",
  "Performance",
  "Documents"
];

const employeePermissions = [
  "CRM",
  "Clients",
  "Reimbursements",
  "Tasks",
  "Attendance",
  "Documents"
];

async function updatePermissions() {
  try {
    console.log("Starting permissions update...");

    // Update Admins
    console.log("Updating admins...");
    const adminsSnapshot = await getDocs(collection(db, 'admins'));
    for (const adminDoc of adminsSnapshot.docs) {
      await updateDoc(doc(db, 'admins', adminDoc.id), {
        permissions: allPermissions
      });
      console.log(`Updated admin: ${adminDoc.id}`);
    }

    // Update Managers
    console.log("Updating managers...");
    const managersSnapshot = await getDocs(collection(db, 'manager'));
    for (const managerDoc of managersSnapshot.docs) {
      // Also update their employee document since managers are also employees
      await updateDoc(doc(db, 'manager', managerDoc.id), {
        permissions: managerPermissions
      });
      await updateDoc(doc(db, 'employees', managerDoc.id), {
        permissions: managerPermissions
      }).catch(() => console.log(`Employee doc for manager ${managerDoc.id} not found, skipping.`));
      console.log(`Updated manager: ${managerDoc.id}`);
    }

    // Update Employees (who are not managers)
    console.log("Updating employees...");
    const employeesSnapshot = await getDocs(collection(db, 'employees'));
    const managerIds = managersSnapshot.docs.map(d => d.id);
    
    for (const employeeDoc of employeesSnapshot.docs) {
      if (!managerIds.includes(employeeDoc.id)) {
        await updateDoc(doc(db, 'employees', employeeDoc.id), {
          permissions: employeePermissions
        });
        console.log(`Updated employee: ${employeeDoc.id}`);
      }
    }

    console.log("Permissions update completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("Error updating permissions:", error);
    process.exit(1);
  }
}

updatePermissions();
