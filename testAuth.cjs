const admin = require('firebase-admin');
const fs = require('fs');

try {
  const serviceAccount = JSON.parse(fs.readFileSync('./serviceAccountKey.json', 'utf8'));
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
  const db = admin.firestore();
  db.collection('test').limit(1).get().then(() => {
    console.log("SUCCESSFULLY AUTHENTICATED WITH Oqulix_ERP KEY!");
    process.exit(0);
  }).catch(e => {
    console.error("Auth failed:", e);
    process.exit(1);
  });
} catch (e) {
  console.error("Failed to read Oqulix_ERP key:", e);
  process.exit(1);
}
