import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, setDoc, doc } from "firebase/firestore";
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
  "CRM", "CRM Analysis", "Finance", "Clients", "Reimbursements", "Tasks", 
  "Attendance", "Employees", "Performance", "Documents", "Settings"
];

const managerPermissions = [
  "CRM", "CRM Analysis", "Clients", "Reimbursements", "Tasks", 
  "Attendance", "Performance", "Documents"
];

const standardPermissions = [
  "CRM", "Clients", "Reimbursements", "Tasks", "Attendance", "Documents"
];

async function setupRoles() {
  try {
    console.log("Fetching existing users...");
    
    // Fetch Admins
    const aSnap = await getDocs(collection(db, 'admins'));
    const adminIds = aSnap.docs.map(d => d.id);
    
    // Fetch Managers
    const mSnap = await getDocs(collection(db, 'manager'));
    const managerIds = mSnap.docs.map(d => d.id);
    
    // Fetch Employees (excluding managers and admins)
    const eSnap = await getDocs(collection(db, 'employees'));
    const employeeIds = eSnap.docs
      .map(d => d.id)
      .filter(id => !managerIds.includes(id) && !adminIds.includes(id));

    console.log("Setting up role documents in 'users' collection...");

    // 1. Admin Role
    await setDoc(doc(db, 'users', 'admin'), {
      userIds: adminIds,
      permissions: allPermissions
    });
    console.log(`Created 'admin' role with ${adminIds.length} users`);

    // 2. HR Role (Mapping managers to HR for demonstration)
    await setDoc(doc(db, 'users', 'HR'), {
      userIds: managerIds,
      permissions: managerPermissions
    });
    console.log(`Created 'HR' role with ${managerIds.length} users`);

    // 3. Sales Associate Role (Mapping standard employees to salesassociate)
    await setDoc(doc(db, 'users', 'salesassociate'), {
      userIds: employeeIds,
      permissions: standardPermissions
    });
    console.log(`Created 'salesassociate' role with ${employeeIds.length} users`);

    // 4. Social Media Manager Role (Empty for now)
    await setDoc(doc(db, 'users', 'socialmediamanager'), {
      userIds: [],
      permissions: ["CRM", "CRM Analysis", "Performance"]
    });
    console.log("Created 'socialmediamanager' role with 0 users");

    console.log("Roles setup successfully!");
    process.exit(0);
  } catch (error) {
    console.error("Error setting up roles:", error);
    process.exit(1);
  }
}

setupRoles();
