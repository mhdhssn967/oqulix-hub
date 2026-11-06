// Helper to get late arrival info and half-day status
// Expected start time is 10:00 AM. Clock-in after 10:15 AM counts as Half Day.
export function getLateArrivalInfo(clockedInAt, workType) {
  if (!clockedInAt || workType === 'Field') {
    return { isLate: false, lateMinutes: 0, lateFormatted: '', isHalfDay: false };
  }
  
  const inDate = clockedInAt.toDate ? clockedInAt.toDate() : new Date(clockedInAt);
  if (isNaN(inDate.getTime())) {
    return { isLate: false, lateMinutes: 0, lateFormatted: '', isHalfDay: false };
  }

  const expectedTime = new Date(inDate);
  expectedTime.setHours(10, 0, 0, 0);

  const diffMs = inDate.getTime() - expectedTime.getTime();
  const lateMinutes = diffMs > 0 ? Math.floor(diffMs / 60000) : 0;
  const isLate = lateMinutes > 0;

  let lateFormatted = '';
  if (isLate) {
    const hours = Math.floor(lateMinutes / 60);
    const mins = lateMinutes % 60;
    if (hours > 0 && mins > 0) {
      lateFormatted = `${hours}h ${mins}m late`;
    } else if (hours > 0) {
      lateFormatted = `${hours}h late`;
    } else {
      lateFormatted = `${mins}m late`;
    }
  }

  // After 10:15 AM = Half Day
  const isHalfDay = lateMinutes > 15;

  return {
    isLate,
    lateMinutes,
    lateFormatted,
    isHalfDay
  };
}

export function calculateEmployeeAttendanceMetrics(emp, empLogs, workingDaysPassed) {
  let presentDays = 0;
  let fieldDays = 0;
  let wfhDays = 0;
  let leaveDays = 0;
  let halfDays = 0;
  let lateDays = 0;
  let totalMinutesWorked = 0;
  let totalScore = 0;
  let scoredDays = 0;

  empLogs.forEach(log => {
    if (log.status === 'On Leave') {
      leaveDays++;
    } else {
      presentDays++;
      if (log.workType === 'Field') fieldDays++;
      else if (log.workType === 'WFH') wfhDays++;
      
      if (log.clockedInAt && log.workType !== 'Field') {
        const lateInfo = getLateArrivalInfo(log.clockedInAt, log.workType);
        if (lateInfo.isLate) lateDays++;
        if (lateInfo.isHalfDay) halfDays++;

        const tIn = log.clockedInAt.toDate ? log.clockedInAt.toDate() : new Date(log.clockedInAt);
        const tOut = log.clockedOutAt ? (log.clockedOutAt.toDate ? log.clockedOutAt.toDate() : new Date(log.clockedOutAt)) : new Date();
        let ms = tOut.getTime() - tIn.getTime();

        let breakMins = 0;
        if (log.breaks && Array.isArray(log.breaks)) {
          log.breaks.forEach(b => {
            if (b.startTime) {
              const bS = b.startTime.toDate ? b.startTime.toDate() : new Date(b.startTime);
              const bE = b.endTime ? (b.endTime.toDate ? b.endTime.toDate() : new Date(b.endTime)) : new Date();
              const bMs = bE.getTime() - bS.getTime();
              breakMins += Math.floor(bMs / 60000);
              ms -= bMs;
            }
          });
        }
        
        const workMins = ms > 0 ? Math.floor(ms / 60000) : 0;
        totalMinutesWorked += workMins;

        // Score logic
        let score = 100;
        
        // Late calculation (expected 10:00 AM)
        const expectedTime = new Date(tIn);
        expectedTime.setHours(10, 0, 0, 0);
        const lateMs = tIn.getTime() - expectedTime.getTime();
        const lateMins = lateMs > 0 ? Math.floor(lateMs / 60000) : 0;
        
        if (lateMins > 0) score -= Math.min(lateMins, 20); 
        if (breakMins > 60) score -= Math.min(breakMins - 60, 20); 
        
        const prodHours = workMins / 60;
        if (prodHours < 6.5) score -= Math.min(Math.floor((6.5 - prodHours) * 10), 30); 
        if (prodHours > 6.5) score += Math.floor((prodHours - 6.5) * 10); // Unlimited bonus to offset penalties 
        
        score = Math.max(0, score);
        totalScore += score;
        scoredDays++;
      }
    }
  });

  const absentDays = Math.max(0, workingDaysPassed - presentDays - leaveDays);
  const totalHours = (totalMinutesWorked / 60).toFixed(1);
  
  const expectedWorkingDays = Math.max(0, workingDaysPassed - fieldDays);
  const expectedHours = (expectedWorkingDays * 6.5).toFixed(1);

  const daysWithHours = presentDays - fieldDays;
  const avgHours = daysWithHours > 0 ? (totalMinutesWorked / 60 / daysWithHours).toFixed(1) : 0;
  
  let avgScore = scoredDays > 0 ? Math.round(totalScore / scoredDays) : (fieldDays > 0 ? 100 : 0);
  avgScore = Math.min(100, avgScore); // Cap final monthly average at 100

  return {
    id: emp.id,
    name: emp.name || 'Unknown',
    position: emp.position || '-',
    presentDays,
    halfDays,
    lateDays,
    workingDaysPassed,
    absentDays,
    leaveDays,
    fieldDays,
    wfhDays,
    totalHours,
    avgHours,
    expectedHours,
    avgScore
  };
}
