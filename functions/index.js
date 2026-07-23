const functions = require("firebase-functions");
const admin = require("firebase-admin");
admin.initializeApp();

exports.onReimbursementCreated = functions.firestore
  .document("userData/{companyId}/reimbursements/{reimbursementId}")
  .onCreate(async (snap, context) => {
    const data = snap.data();
    const companyId = context.params.companyId;

    if (data.status !== "Pending") {
      return null;
    }

    const title = data.title || "New Reimbursement";
    const employeeName = data.employeeName || "An employee";
    const amount = data.amount || 0;
    const body = `${employeeName} requested ₹${amount} for ${title}.`;

    try {
      const tokens = [];

      // 1. Get Admin Tokens
      const adminsSnapshot = await admin.firestore().collection("admins").get();
      adminsSnapshot.forEach((doc) => {
        const adminData = doc.data();
        if (adminData.fcmToken) {
          tokens.push(adminData.fcmToken);
        }
      });

      // 2. Get Manager Tokens (Managers are stored in 'employees' with a corresponding doc in 'manager')
      const employeesSnapshot = await admin.firestore().collection("employees").where("companyid", "==", companyId).get();
      for (const empDoc of employeesSnapshot.docs) {
        if (empDoc.data().fcmToken) {
          // Check if this employee is a manager
          const isManagerDoc = await admin.firestore().collection("manager").doc(empDoc.id).get();
          if (isManagerDoc.exists) {
            tokens.push(empDoc.data().fcmToken);
          }
        }
      }

      // Remove duplicates
      const uniqueTokens = [...new Set(tokens)];

      if (uniqueTokens.length === 0) {
        console.log("No admins/managers with FCM tokens found.");
        return null;
      }

      const message = {
        notification: {
          title: "New Reimbursement Request",
          body: body,
        },
        tokens: uniqueTokens,
      };

      const response = await admin.messaging().sendMulticast(message);
      console.log(`${response.successCount} push notifications sent successfully.`);
      return null;
    } catch (error) {
      console.error("Error sending push notification:", error);
      return null;
    }
  });
