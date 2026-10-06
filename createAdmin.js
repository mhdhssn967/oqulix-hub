import { initializeApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, setDoc, updateDoc, arrayUnion } from "firebase/firestore";
import dotenv from 'dotenv';

dotenv.config();

const firebaseConfig = {
  apiKey: "AIzaSyA3-2GbzNSBHv__hfaJzvqIdgV_ozvVgfE",
  authDomain: "interlix-2d61f.firebaseapp.com",
  projectId: "interlix-2d61f",
  storageBucket: "interlix-2d61f.firebasestorage.app",
  messagingSenderId: "106645468469",
  appId: "1:106645468469:web:e4ffc62c4d7eb6e9a8087c",
  measurementId: "G-KPY7Z9GJEX"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

async function createAdmin() {
  try {
    const email = 'admin@demo.com';
    const password = 'password123';
    
    console.log("Creating admin account...");
    let userCredential;
    try {
      userCredential = await createUserWithEmailAndPassword(auth, email, password);
    } catch (err) {
      if (err.code === 'auth/email-already-in-use') {
         console.log("Admin account already exists. Run this with a different email if needed.");
         process.exit(1);
      }
      throw err;
    }
    
    const uid = userCredential.user.uid;
    console.log(`Created admin account. UID: ${uid}`);

    // 1. Add UID to admin role
    await updateDoc(doc(db, 'users', 'admin'), {
      userIds: arrayUnion(uid)
    });
    console.log("Added to admin role.");

    // 2. Create employee record to link companyId
    await setDoc(doc(db, 'employees', uid), {
      name: "Demo Admin",
      email: email,
      companyid: "SbHx5KAgBiXpEYIFyT4ht53alFz1",
      permissions: [
        "CRM", "CRM Analysis", "Finance", "Clients", "Reimbursements", 
        "Tasks", "Attendance", "Employees", "Performance", "Documents", "Settings"
      ]
    });
    console.log("Created employee record mapping to the demo company data.");

    console.log("Admin setup complete. You can now login with:");
    console.log(`Email: ${email}`);
    console.log(`Password: ${password}`);
    process.exit(0);
  } catch (error) {
    console.error("Script failed:", error);
    process.exit(1);
  }
}

createAdmin();
