export function calculateEmployeeAttendanceMetrics(emp, empLogs, workingDaysPassed) {
  let presentDays = 0;
  let fieldDays = 0;
  let wfhDays = 0;
  let leaveDays = 0;
  let totalMinutesWorked = 0;

  empLogs.forEach(log => {
    if (log.status === 'On Leave') {
      leaveDays++;
    } else {
      presentDays++;
      if (log.workType === 'Field') fieldDays++;
      else if (log.workType === 'WFH') wfhDays++;
      
      if (log.clockedInAt && log.workType !== 'Field') {
        const tIn = log.clockedInAt.toDate ? log.clockedInAt.toDate() : new Date(log.clockedInAt);
        const tOut = log.clockedOutAt ? (log.clockedOutAt.toDate ? log.clockedOutAt.toDate() : new Date(log.clockedOutAt)) : new Date();
        let ms = tOut.getTime() - tIn.getTime();

        if (log.breaks && Array.isArray(log.breaks)) {
          log.breaks.forEach(b => {
            if (b.startTime) {
              const bS = b.startTime.toDate ? b.startTime.toDate() : new Date(b.startTime);
              const bE = b.endTime ? (b.endTime.toDate ? b.endTime.toDate() : new Date(b.endTime)) : new Date();
              ms -= (bE.getTime() - bS.getTime());
            }
          });
        }
        if (ms > 0) {
          totalMinutesWorked += Math.floor(ms / 60000);
        }
      }
    }
  });

  const absentDays = Math.max(0, workingDaysPassed - presentDays - leaveDays);
  const totalHours = (totalMinutesWorked / 60).toFixed(1);
  
  const expectedWorkingDays = Math.max(0, workingDaysPassed - fieldDays);
  const expectedHours = (expectedWorkingDays * 6.5).toFixed(1);

  const daysWithHours = presentDays - fieldDays;
  const avgHours = daysWithHours > 0 ? (totalMinutesWorked / 60 / daysWithHours).toFixed(1) : 0;

  return {
    id: emp.id,
    name: emp.name || 'Unknown',
    position: emp.position || '-',
    presentDays,
    workingDaysPassed,
    absentDays,
    leaveDays,
    fieldDays,
    wfhDays,
    totalHours,
    avgHours,
    expectedHours
  };
}
