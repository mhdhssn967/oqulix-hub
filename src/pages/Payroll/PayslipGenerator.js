import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export const generatePayslipPDF = async (employeeName, payrollData, companyName = 'Your Company') => {
  // Create a hidden, beautifully formatted HTML template
  const container = document.createElement('div');
  container.style.position = 'absolute';
  container.style.left = '-9999px';
  container.style.top = '0';
  container.style.width = '800px';
  container.style.padding = '40px';
  container.style.backgroundColor = '#ffffff';
  container.style.color = '#000000';
  container.style.fontFamily = '"Inter", sans-serif';

  const { month, baseSalary, bonus, incentives, deductions, netSalary, processedDate } = payrollData;
  const processDateStr = processedDate && processedDate.toDate ? processedDate.toDate().toLocaleDateString() : (processedDate ? new Date(processedDate).toLocaleDateString() : 'N/A');

  container.innerHTML = `
    <div style="border: 1px solid #e4e4e7; border-radius: 12px; padding: 40px;">
      <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #000; padding-bottom: 20px; margin-bottom: 30px;">
        <div>
          <h1 style="margin: 0; font-size: 28px; font-weight: 800; text-transform: uppercase;">PAYSLIP</h1>
          <p style="margin: 5px 0 0 0; font-size: 14px; color: #52525b;">${month}</p>
        </div>
        <div style="text-align: right;">
          <h2 style="margin: 0; font-size: 20px; font-weight: 700;">${companyName}</h2>
          <p style="margin: 5px 0 0 0; font-size: 14px; color: #52525b;">Confidential Document</p>
        </div>
      </div>

      <div style="display: flex; justify-content: space-between; margin-bottom: 40px;">
        <div>
          <p style="margin: 0; font-size: 12px; color: #71717a; text-transform: uppercase; font-weight: 600;">Employee Name</p>
          <p style="margin: 4px 0 0 0; font-size: 16px; font-weight: 600;">${employeeName}</p>
        </div>
        <div style="text-align: right;">
          <p style="margin: 0; font-size: 12px; color: #71717a; text-transform: uppercase; font-weight: 600;">Date Processed</p>
          <p style="margin: 4px 0 0 0; font-size: 16px; font-weight: 600;">${processDateStr}</p>
        </div>
      </div>

      <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
        <thead>
          <tr style="background-color: #f4f4f5;">
            <th style="padding: 12px; text-align: left; font-size: 12px; font-weight: 700; text-transform: uppercase; border-bottom: 1px solid #d4d4d8;">Description</th>
            <th style="padding: 12px; text-align: right; font-size: 12px; font-weight: 700; text-transform: uppercase; border-bottom: 1px solid #d4d4d8;">Amount</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="padding: 12px; border-bottom: 1px solid #e4e4e7; font-size: 14px;">Base Salary</td>
            <td style="padding: 12px; text-align: right; border-bottom: 1px solid #e4e4e7; font-size: 14px; font-weight: 500;">₹${baseSalary?.toLocaleString() || 0}</td>
          </tr>
          <tr>
            <td style="padding: 12px; border-bottom: 1px solid #e4e4e7; font-size: 14px;">Bonus</td>
            <td style="padding: 12px; text-align: right; border-bottom: 1px solid #e4e4e7; font-size: 14px; font-weight: 500;">₹${bonus?.toLocaleString() || 0}</td>
          </tr>
          <tr>
            <td style="padding: 12px; border-bottom: 1px solid #e4e4e7; font-size: 14px;">Incentives</td>
            <td style="padding: 12px; text-align: right; border-bottom: 1px solid #e4e4e7; font-size: 14px; font-weight: 500;">₹${incentives?.toLocaleString() || 0}</td>
          </tr>
          <tr>
            <td style="padding: 12px; border-bottom: 2px solid #000; font-size: 14px; color: #ef4444;">Deductions</td>
            <td style="padding: 12px; text-align: right; border-bottom: 2px solid #000; font-size: 14px; font-weight: 500; color: #ef4444;">- ₹${deductions?.toLocaleString() || 0}</td>
          </tr>
        </tbody>
        <tfoot>
          <tr>
            <td style="padding: 16px 12px; font-size: 18px; font-weight: 800;">Net Salary</td>
            <td style="padding: 16px 12px; text-align: right; font-size: 20px; font-weight: 800;">₹${netSalary?.toLocaleString() || 0}</td>
          </tr>
        </tfoot>
      </table>

      <div style="margin-top: 50px; text-align: center;">
        <p style="font-size: 12px; color: #a1a1aa;">This is a computer-generated document. No signature is required.</p>
      </div>
    </div>
  `;

  document.body.appendChild(container);

  try {
    const canvas = await html2canvas(container, { scale: 2 });
    const imgData = canvas.toDataURL('image/png');
    
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'pt',
      format: 'a4'
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    pdf.save(`${employeeName.replace(/\s+/g, '_')}_Payslip_${month}.pdf`);
  } catch (error) {
    console.error("Error generating PDF:", error);
    throw error;
  } finally {
    document.body.removeChild(container);
  }
};
