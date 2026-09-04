const admin = require('firebase-admin');
const fs = require('fs');

async function run() {
  const serviceAccount = JSON.parse(fs.readFileSync('./serviceAccountKey.json', 'utf8'));
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
  const db = admin.firestore();

  const companiesSnapshot = await db.collection('userData').get();
  companiesSnapshot.forEach(doc => {
    console.log("Company:", doc.id);
  });
  
  process.exit(0);
}

run();
