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

      const response = await admin.messaging().sendEachForMulticast(message);
      console.log(`${response.successCount} push notifications sent successfully.`);
      return null;
    } catch (error) {
      console.error("Error sending push notification:", error);
      return null;
    }
  });

exports.onReimbursementUpdated = functions.firestore
  .document("userData/{companyId}/reimbursements/{reimbursementId}")
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();

    if (before.status === after.status) {
      return null;
    }

    if (after.status !== "Sent" && after.status !== "Rejected") {
      return null;
    }

    const employeeUid = after.employeeUid;
    if (!employeeUid) return null;

    const title = after.title || "Reimbursement";
    const amount = after.amount || 0;
    
    let notificationTitle = "";
    let notificationBody = "";

    if (after.status === "Sent") {
      notificationTitle = "Reimbursement Sent 💸";
      notificationBody = `Your reimbursement for ${title} (₹${amount}) has been paid.`;
    } else if (after.status === "Rejected") {
      notificationTitle = "Reimbursement Rejected ❌";
      notificationBody = `Your reimbursement for ${title} (₹${amount}) was rejected.`;
    }

    try {
      const empDoc = await admin.firestore().collection("employees").doc(employeeUid).get();
      if (!empDoc.exists) {
        // Fallback: check if the user is an admin requesting reimbursement
        const adminDoc = await admin.firestore().collection("admins").doc(employeeUid).get();
        if (!adminDoc.exists || !adminDoc.data().fcmToken) return null;
        
        const message = {
          notification: { title: notificationTitle, body: notificationBody },
          token: adminDoc.data().fcmToken,
        };
        await admin.messaging().send(message);
        return null;
      }

      const fcmToken = empDoc.data().fcmToken;
      if (!fcmToken) {
        console.log(`No FCM token for employee ${employeeUid}`);
        return null;
      }

      const message = {
        notification: {
          title: notificationTitle,
          body: notificationBody,
        },
        token: fcmToken,
      };

      await admin.messaging().send(message);
      console.log(`Notification sent to employee ${employeeUid} for status ${after.status}`);
      return null;
    } catch (error) {
      console.error("Error sending update notification to employee:", error);
      return null;
    }
  });
