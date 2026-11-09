/**
 * Determines whether a transferred lead has had subsequent interaction or status update
 * by the associate it was assigned / transferred to.
 * 
 * If a lead was transferred:
 * - It contains `transferredFromName` or a transfer entry in `transferHistory` or `statusHistory`.
 * - If the associate has NOT updated the status or added remarks/interactions since the transfer,
 *   it should NOT count as their active lead in CRM Analysis or Team CRM.
 * - If the associate has made an update after the transfer, it counts!
 * 
 * @param {Object} item The lead, adLead, or distributor item
 * @param {string} [associateName] Optional associate name to check against
 * @param {string} [associateUid] Optional associate UID to check against
 * @returns {boolean} true if the item should be counted / included, false if it's an untouched transferred lead
 */
export function shouldIncludeTransferredItem(item, associateName = '', associateUid = '') {
  if (!item) return false;

  // Check if item was transferred
  const isTransferred = Boolean(
    item.transferredFromName || 
    item.transferredFromUid ||
    (item.transferHistory && item.transferHistory.length > 0)
  );

  // If it was never transferred, it is a normal lead -> include it
  if (!isTransferred) return true;

  // If it is transferred, verify if there has been any activity or status update by the associate
  const history = item.statusHistory || item.history || [];
  if (!Array.isArray(history) || history.length === 0) {
    // Transferred with no history at all -> untouched
    return false;
  }

  // Find the timestamp or index of the latest transfer event
  let lastTransferTime = 0;
  let lastTransferIndex = -1;

  history.forEach((h, idx) => {
    const statusText = (h.status || '').toLowerCase();
    const remarksText = (h.remarks || '').toLowerCase();
    const isTransferEntry = 
      statusText.startsWith('transferred') || 
      remarksText.startsWith('lead transferred') || 
      remarksText.startsWith('bulk transferred') ||
      Boolean(h.transferredTo || h.transferredToUid);

    if (isTransferEntry) {
      lastTransferIndex = idx;
      if (h.date) {
        const t = new Date(h.date).getTime();
        if (!isNaN(t) && t > lastTransferTime) {
          lastTransferTime = t;
        }
      }
    }
  });

  // Check transferHistory array as well for latest transfer date if available
  if (Array.isArray(item.transferHistory) && item.transferHistory.length > 0) {
    item.transferHistory.forEach(th => {
      if (th.date) {
        const t = new Date(th.date).getTime();
        if (!isNaN(t) && t > lastTransferTime) {
          lastTransferTime = t;
        }
      }
    });
  }

  // If we found a transfer entry in statusHistory, check if any entry occurred after it
  if (lastTransferIndex !== -1) {
    const postTransferEntries = history.slice(lastTransferIndex + 1);
    // Filter out any other transfer logs
    const validPostUpdates = postTransferEntries.filter(h => {
      const s = (h.status || '').toLowerCase();
      const r = (h.remarks || '').toLowerCase();
      return !s.startsWith('transferred') && !r.startsWith('lead transferred') && !r.startsWith('bulk transferred');
    });

    if (validPostUpdates.length > 0) {
      return true; // Associate made updates after the transfer
    }
  }

  // Alternatively, check by timestamp if dates are present
  if (lastTransferTime > 0) {
    const hasLaterActivity = history.some(h => {
      const s = (h.status || '').toLowerCase();
      const r = (h.remarks || '').toLowerCase();
      if (s.startsWith('transferred') || r.startsWith('lead transferred') || r.startsWith('bulk transferred')) {
        return false;
      }
      if (h.date) {
        const t = new Date(h.date).getTime();
        return !isNaN(t) && t > lastTransferTime;
      }
      return false;
    });

    if (hasLaterActivity) return true;
  }

  // Also check if currentStatus differs from initial or transfer status (e.g. they changed status via edit)
  // Check if item's updatedAt is significantly after the transfer date (by at least 60 seconds)
  // and status is not a default untouched status
  if (lastTransferTime > 0 && item.updatedAt) {
    const updatedMs = item.updatedAt.seconds ? item.updatedAt.seconds * 1000 : new Date(item.updatedAt).getTime();
    if (!isNaN(updatedMs) && updatedMs - lastTransferTime > 60000) {
      // Further verify if the status is active / interacted with
      const s = (item.currentStatus || '').toLowerCase();
      if (s !== 'new lead' && !s.startsWith('transferred')) {
        return true;
      }
    }
  }

  // No activity found after transfer -> do not count
  return false;
}

