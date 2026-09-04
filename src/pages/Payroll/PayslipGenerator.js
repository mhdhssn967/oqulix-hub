import { jsPDF } from 'jspdf';

const svgToPng = (svgString) => {
  return new Promise((resolve) => {
    const img = new Image();
    const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 64; 
      canvas.height = 64;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, 64, 64);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
};

const svgUser = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#666666" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`;
const svgBriefcase = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#666666" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="14" x="2" y="7" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>`;
const svgCalendar = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#666666" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>`;
const svgId = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#666666" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 10h2"/><path d="M16 14h2"/><path d="M6.17 15a3 3 0 0 1 5.66 0"/><circle cx="9" cy="11" r="2"/><rect x="2" y="5" width="20" height="14" rx="2"/></svg>`;

export const generatePayslipPDF = async (employeeName, payrollData, companyName = 'Oqulix') => {
  const { month, baseSalary, bonus, incentives, deductions, netSalary, processedDate } = payrollData;
  const processDateStr = processedDate && processedDate.toDate 
    ? processedDate.toDate().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) 
    : (processedDate ? new Date(processedDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A');

  let formattedMonth = month || 'N/A';
  if (month && typeof month === 'string' && month.includes('-')) {
    const [year, monthNum] = month.split('-');
    const dateObj = new Date(parseInt(year, 10), parseInt(monthNum, 10) - 1, 1);
    formattedMonth = dateObj.toLocaleString('en-IN', { month: 'long', year: 'numeric' });
  }

  const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
  const margin = 45;
  const pageWidth = pdf.internal.pageSize.getWidth();
  let y = 0;

  // Render Icons to PNG
  const [iconUser, iconBriefcase, iconCalendar, iconId] = await Promise.all([
    svgToPng(svgUser), svgToPng(svgBriefcase), svgToPng(svgCalendar), svgToPng(svgId)
  ]);

  // Header Background Box (INK)
  pdf.setFillColor(15, 15, 15);
  pdf.rect(0, 0, pageWidth, 105, 'F');

  // Load Logo
  const logoImg = new Image();
  logoImg.src = '/logo_transp.png';
  const logoLoaded = await new Promise((resolve) => {
    logoImg.onload = () => resolve(true);
    logoImg.onerror = () => resolve(false);
  });

  if (logoLoaded) {
    const targetHeight = 36;
    const targetWidth = (logoImg.width / logoImg.height) * targetHeight;
    pdf.addImage(logoImg, 'PNG', margin, 34, targetWidth, targetHeight);
  } else {
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(24);
    pdf.setTextColor(255, 255, 255);
    pdf.text(companyName, margin, 60);
  }

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(12);
  pdf.setTextColor(180, 180, 180);
  pdf.text(`PAYSLIP  ·  ${formattedMonth.toUpperCase()}`, pageWidth - margin, 58, { align: 'right' });

  // Employee Details - Table Grid
  y = 145;
  pdf.setDrawColor(210, 210, 210);
  pdf.setLineWidth(1);
  pdf.rect(margin, y, pageWidth - 2 * margin, 90, 'S'); // Outer box
  pdf.line(pageWidth / 2, y, pageWidth / 2, y + 90); // Vertical divider
  pdf.line(margin, y + 45, pageWidth - margin, y + 45); // Horizontal divider
  
  const drawIconDetail = (icon, label, value, x, yPos) => {
    if (icon) pdf.addImage(icon, 'PNG', x + 12, yPos + 12, 20, 20);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    pdf.setTextColor(120, 120, 120);
    pdf.text(label.toUpperCase(), x + 42, yPos + 20);
    
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(11);
    pdf.setTextColor(30, 30, 30);
    pdf.text(value, x + 42, yPos + 35);
  };
  
  drawIconDetail(iconUser, 'Employee Name', employeeName || 'Employee', margin, y);
  drawIconDetail(iconId, 'Employee ID', payrollData.employeeId || '—', pageWidth / 2, y);
  drawIconDetail(iconBriefcase, 'Designation', payrollData.role || '—', margin, y + 45);
  drawIconDetail(iconCalendar, 'Date Processed', processDateStr, pageWidth / 2, y + 45);

  y += 120; // 90 height + 30 spacing

  const currency = (amount) => `Rs. ${(amount || 0).toLocaleString('en-IN')}`;

  const drawTableHeader = (title) => {
    pdf.setFillColor(245, 245, 245);
    pdf.setDrawColor(210, 210, 210);
    pdf.setLineWidth(1);
    pdf.rect(margin, y, pageWidth - 2 * margin, 26, 'FD');
    
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(10);
    pdf.setTextColor(80, 80, 80);
    pdf.text(title.toUpperCase(), margin + 12, y + 17);
    pdf.text('AMOUNT', pageWidth - margin - 12, y + 17, { align: 'right' });
    y += 26;
  };

  const drawTableRow = (label, amount, isBold = false) => {
    const rowHeight = 28;
    pdf.setDrawColor(210, 210, 210);
    pdf.rect(margin, y, pageWidth - 2 * margin, rowHeight, 'S'); // Full row box
    pdf.line(pageWidth - margin - 120, y, pageWidth - margin - 120, y + rowHeight); // Column divider

    pdf.setFont('helvetica', isBold ? 'bold' : 'normal');
    pdf.setFontSize(11);
    pdf.setTextColor(isBold ? 10 : 40, isBold ? 10 : 40, isBold ? 10 : 40);
    pdf.text(label, margin + 12, y + 19);
    pdf.text(currency(amount), pageWidth - margin - 12, y + 19, { align: 'right' });
    y += rowHeight;
  };

  drawTableHeader('Earnings');
  drawTableRow('Basic pay', baseSalary);
  
  if ((bonus || 0) > 0) drawTableRow('Bonus', bonus);
  if ((incentives || 0) > 0) drawTableRow('Other incentives', incentives);
  
  const gross = (baseSalary || 0) + (bonus || 0) + (incentives || 0);
  drawTableRow('Gross earnings', gross, true);
  
  // Deductions Table
  if ((deductions || 0) > 0) {
    y += 35;
    drawTableHeader('Deductions');
    drawTableRow('Total deductions', deductions, true);
  }

  // Net Pay Section - Highlight Box
  y += 40;
  pdf.setFillColor(15, 15, 15);
  pdf.setDrawColor(15, 15, 15);
  pdf.rect(margin, y, pageWidth - 2 * margin, 50, 'FD');
  
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(14);
  pdf.setTextColor(255, 255, 255);
  pdf.text('Net Pay', margin + 16, y + 31);
  
  pdf.setFontSize(24);
  pdf.text(currency(netSalary), pageWidth - margin - 16, y + 33, { align: 'right' });

  // System-generated disclaimer
  y += 70;
  pdf.setFont('helvetica', 'italic');
  pdf.setFontSize(10);
  pdf.setTextColor(160, 160, 160);
  pdf.text('This is a system-generated payslip and does not require a signature.', pageWidth / 2, y, { align: 'center' });

  // Black Footer at absolute bottom
  const pageHeight = pdf.internal.pageSize.getHeight();
  const footerHeight = 40;
  
  pdf.setFillColor(15, 15, 15);
  pdf.rect(0, pageHeight - footerHeight, pageWidth, footerHeight, 'F');
  
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(10);
  pdf.setTextColor(255, 255, 255);
  pdf.text('Oqulix Pvt. Ltd.', margin, pageHeight - 15);
  pdf.text('Kerala, India', pageWidth - margin, pageHeight - 15, { align: 'right' });

  // Save PDF
  const safeEmpName = (employeeName || 'Employee').replace(/\s+/g, '_');
  const safeMonthName = formattedMonth.replace(/\s+/g, '_');
  pdf.save(`${safeEmpName}_Payslip_${safeMonthName}.pdf`);
};
