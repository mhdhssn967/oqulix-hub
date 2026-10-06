import { initializeApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";
import fs from 'fs';
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

async function registerUsers() {
  try {
    const rawData = JSON.parse(fs.readFileSync('demo_data.json', 'utf8'));
    let registeredCount = 0;
    
    // We will collect unique credentials
    const credentials = new Map();

    if (rawData.userData) {
      for (const userId in rawData.userData) {
        const collections = rawData.userData[userId];
        if (collections.employees) {
          for (const emp of collections.employees) {
            if (emp.email && emp.password) {
              credentials.set(emp.email, emp.password);
            }
          }
        }
      }
    }

    console.log(`Found ${credentials.size} unique employee accounts to register.`);

    for (const [email, password] of credentials.entries()) {
      try {
        await createUserWithEmailAndPassword(auth, email, password);
        console.log(`Registered: ${email}`);
        registeredCount++;
      } catch (error) {
        if (error.code === 'auth/email-already-in-use') {
           console.log(`Already registered: ${email}`);
        } else {
           console.error(`Failed to register ${email}:`, error.message);
        }
      }
    }

    console.log(`Successfully registered ${registeredCount} auth accounts.`);
    process.exit(0);
  } catch (error) {
    console.error("Registration script failed:", error);
    process.exit(1);
  }
}

registerUsers();
