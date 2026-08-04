import React, { useRef } from 'react';
import { ArrowLeft, Printer, Download } from 'lucide-react';
import html2pdf from 'html2pdf.js';
import OQ from '../assets/OQ.png';
import seal from '../assets/seal.png';
import '../styles/Document.css';

export default function DocumentPreview({ config, formData, textData, onBack }) {
  const pageRefs = useRef([]);

  const handleDownload = () => {
    const element = document.getElementById('document-container');
    const opt = {
      margin:       0,
      filename:     `${formData.client || 'Document'}.pdf`,
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2, useCORS: true },
      jsPDF:        { unit: 'px', format: [794, 1123], orientation: 'portrait' }
    };
    html2pdf().set(opt).from(element).save();
  };

  const handlePrint = () => {
    window.print();
  };

  const items = formData.complementaryItems || [];
  const discount = Number(formData.discount) || 0;
  
  const packagePrice = Number(formData.packagePrice) || 0;
  const packageQuantity = Number(formData.packageQuantity) || 0;
  const packageTotal = packagePrice * packageQuantity;
  const itemsSubtotal = items.reduce((sum, item) => sum + (Number(item.price) * Number(item.quantity)), 0);
  const price = packageTotal + itemsSubtotal;
  const discountedPrice = price - discount;
  const oneTimeGST = Math.round(discountedPrice * 0.18);
  const oneTimeTotal = discountedPrice + oneTimeGST;

  const Header = () => (
    <div className="mail-header">
      <img src={OQ} alt="Oqulix Logo" />
      <div className="adress">
        <p>
          <strong>OQULIX Pvt. Ltd.</strong> <br />
          14/291 N, Suite 48M 1st Floor,
          <br /> A Square Building,
          <br />
          Edappally ,Edathala P O,
          <br />
          Ernakulam, Kerala, 683561
          <br />
          +91 9447433005
          <br />
          contact@oqulix.com
          <br />
          CIN: U62099KL2023PTC084540
        </p>
      </div>
    </div>
  );

  const Footer = () => (
    <div className="page-footer">
      <a href="https://www.oqulix.com">www.oqulix.com</a>
    </div>
  );

  return (
    <div className="w-full bg-zinc-100 min-h-screen py-8 flex flex-col items-center">
      {/* Action Bar */}
      <div className="w-[794px] flex items-center justify-between mb-6 print:hidden">
        <button 
          onClick={onBack}
          className="flex items-center gap-2 px-4 py-2 bg-white text-zinc-700 border border-zinc-200 rounded-lg hover:bg-zinc-50 transition-colors text-sm font-medium shadow-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Edit
        </button>
        <div className="flex items-center gap-3">
          <button 
            onClick={handleDownload}
            className="flex items-center gap-2 px-4 py-2 bg-white text-zinc-700 border border-zinc-200 rounded-lg hover:bg-zinc-50 transition-colors text-sm font-medium shadow-sm"
          >
            <Download className="w-4 h-4" />
            Download PDF
          </button>
          <button 
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg hover:bg-zinc-800 transition-colors text-sm font-medium shadow-sm"
          >
            <Printer className="w-4 h-4" />
            Print
          </button>
        </div>
      </div>

      <div id="document-container" className="document-preview-container print:gap-0">
        {/* Page 1 */}
        <div className="page">
          <Header />
          <div className="main-page">
            <div className="main-page-heading">
              <div className="left">
                <h1>Quotation</h1>
                <p>Valid until {formData.validUntil}</p>
              </div>
              <p>{formData.date || "Date"}</p>
            </div>

            <p style={{ marginTop: "6px", fontWeight: 600, fontSize: '28px' }}>
              Special Quotation - {formData.recipient || "Client"}
            </p>
            <div className="to-adress">
              <p>
                To, <br />
                <strong>{formData.recipient || "Recipient Name"}</strong> <br /> 
                <strong>{formData.institutionName || "Institution Name"}</strong> <br />
                {formData.addressLine1 || "Address Line 1"} <br />
                {formData.addressLine2 || "Address Line 2"}
              </p>
            </div>
            <div className="to-adress" style={{ marginTop: '20px' }}>
              <p>
                From, <br />
                <strong> OQULIX PVT. LTD</strong> <br />
                Suite 48M 1st Floor, A Square Building, <br />
                Edappally, Edathala P O, Ernakulam, Kerala <br />
                683561
              </p>
            </div>

            <div className="mail-content" style={{ marginTop: '40px' }}>
              <p>Dear Team, </p>
              <div 
                className="mail-content-dynamic" 
                style={{ textAlign: "justify", lineHeight: 1.6, marginTop: '10px' }}
                dangerouslySetInnerHTML={{
                  __html: textData?.coverLetter || `<p>It was a pleasure demonstrating our flagship product, <strong>Happy Moves</strong>, to you. We appreciate the opportunity to showcase how our innovative physiotherapy VR tool can enhance the rehabilitation experience for your patients, making their journey towards recovery more engaging and effective.</p>`
                }}
              />
            </div>
            
            <div className="regards" style={{ marginTop: '40px' }}>
              <p>
                Regards <br />
                Team <strong>OQULIX</strong>
              </p>
              <div className="seal-div">
                <img className="seal-img" src={seal} alt="Seal" />
              </div>
            </div>
          </div>
          <Footer />
        </div>

        {/* Page 2 */}
        <div className="page">
          <Header />
          <div className="main-page">
            <div className="main-page-heading">
              <div className="left">
                <h1>Item Description</h1>
              </div>
              <p>{formData.date || "Date"}</p>
            </div>

            <div className="quotation-table-div" style={{ marginTop: '20px' }}>
              <table className="quotation-table">
                <thead>
                  <tr>
                    <th>ITEM</th>
                    <th>QTY</th>
                    <th>PRICE</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>{formData.packageName || "HAPPY MOVES - STANDARD"}</td>
                    <td>{packageQuantity}</td>
                    <td>{packageTotal.toLocaleString()}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {items.length > 0 && (
              <div className="quotation-table-div" style={{ marginTop: '30px' }}>
                <h3 style={{ textDecoration: "underline", marginBottom: '10px' }}>
                  COMPLEMENTARY PRODUCTS
                </h3>
                <table className="quotation-table">
                  <thead>
                    <tr>
                      <th>PRODUCT</th>
                      <th>QTY</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, index) => (
                      <tr key={index}>
                        <td>{item.name}</td>
                        <td>{item.quantity}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <table className="total-table">
              <tbody>
                <tr>
                  <td>SUBTOTAL</td>
                  <td>INR {price.toLocaleString()}</td>
                </tr>
                {discount > 0 && (
                  <>
                    <tr className="discount">
                      <td>DISCOUNT</td>
                      <td>INR {discount.toLocaleString()}</td>
                    </tr>
                    <tr className="discount-total">
                      <td>DISCOUNTED PRICE</td>
                      <td>INR {discountedPrice.toLocaleString()}</td>
                    </tr>
                  </>
                )}
                <tr>
                  <td>GST 18%</td>
                  <td>INR {oneTimeGST.toLocaleString()}</td>
                </tr>
                <tr className="total-price">
                  <td>TOTAL PRICE</td>
                  <td>INR {oneTimeTotal.toLocaleString()}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <Footer />
        </div>

        {/* Page 4 */}
        <div className="page">
          <Header />
          <div className="main-page">
            <div className="main-page-heading">
              <div className="left"></div>
              <p>{formData.date || "Date"}</p>
            </div>

            <div className="license-agreement" style={{ marginTop: '20px' }}>
              <h2 style={{ textDecoration: "underline", textAlign: "center", marginBottom: '20px' }}>
                SOFTWARE LICENSE AGREEMENT
              </h2>
              <div 
                className="license-agreement-dynamic"
                dangerouslySetInnerHTML={{
                  __html: textData?.slaPage1 || `<p><strong>Software License Agreement</strong> ("Agreement") is entered into between Oqulix, hereinafter referred to as "Licensor," and the entity or individual licensing the software, hereinafter referred to as "Licensee." This Agreement governs the use of the Happy Moves software.</p>
                    <ol>
                      <li><strong>License Grant:</strong>
                        <ul>
                          <li>Subject to the terms and conditions of this Agreement, Licensor grants Licensee a non-exclusive, non-transferable license to use the Happy Moves software.</li>
                        </ul>
                      </li>
                      <li><strong>Scope of Use:</strong>
                        <ul>
                          <li>Happy Moves is not a healthcare product. It is intended for rehabilitation, therapy, and wellness purposes.</li>
                          <li>Licensee acknowledges that Happy Moves is not a substitute for professional healthcare advice, diagnosis, or treatment.</li>
                          <li>Licensee acknowledges that if any problems arise during the use of Happy Moves, Oqulix will not be held responsible.</li>
                          <li>Licensee agrees to ensure that the software is used under the guidance of a certified therapist or healthcare professional.</li>
                        </ul>
                      </li>
                      <li><strong>Feedback and Update Policy:</strong>
                        <ul>
                          <li>Oqulix values client feedback and suggestions for enhancing the Happy Moves software.</li>
                          <li>While Oqulix appreciates and considers all suggestions, including those from hospitals, it is important to note that not all suggestions will be implemented.</li>
                          <li>The company reserves the right to selectively incorporate feedback into future updates, prioritizing based on development needs and strategic considerations.</li>
                        </ul>
                      </li>
                      <li><strong>Intellectual Property:</strong>
                        <ul>
                          <li>The Happy Moves software, including all intellectual property rights, remains the exclusive property of Oqulix.</li>
                        </ul>
                      </li>
                    </ol>`
                }}
              />
            </div>
          </div>
          <Footer />
        </div>

        {/* Page 5 */}
        <div className="page">
          <Header />
          <div className="main-page">
            <div className="main-page-heading">
              <div className="left"></div>
              <p>{formData.date || "Date"}</p>
            </div>

            <div className="license-agreement" style={{ marginTop: '20px' }}>
              <h2 style={{ textDecoration: "underline", textAlign: "center", marginBottom: '20px' }}>
                SOFTWARE LICENSE AGREEMENT
              </h2>
              <div 
                className="license-agreement-dynamic"
                dangerouslySetInnerHTML={{
                  __html: textData?.slaPage2 || `<ol start="5">
                      <li><strong>Confidentiality of Pricing Details and Software Content:</strong>
                        <ul>
                          <li>Licensee agrees to maintain strict confidentiality regarding the pricing details of the Happy Moves software, as well as any offers or subsidies provided by Oqulix. This information shall not be disclosed to any third party, media, or on the internet.</li>
                          <li>Additionally, Licensee commits not to publish the software content, including any proprietary information, to any third party or third-party applications without the explicit written consent of Oqulix.</li>
                        </ul>
                      </li>
                      <li><strong>Protection Against Cloning:</strong>
                        <ul>
                          <li>Licensee acknowledges that any attempts to clone, reproduce, or replicate the Happy Moves software without explicit authorization from Oqulix will be considered malpractice.</li>
                          <li>In the event of unauthorized cloning, Licensee agrees to pay compensation to Oqulix for damages incurred.</li>
                          <li>Oqulix reserves the right to pursue legal action to protect its intellectual property rights.</li>
                        </ul>
                      </li>
                      <li><strong>Customer Support:</strong>
                        <ul>
                          <li>The VR Hardware is a complementary product. In case of hardware-related issues, the Licensee shall seek consultation and support directly from the external hardware vendors. Oqulix will facilitate communication by providing a designated channel for interaction between the Licensee and the hardware vendors.</li>
                          <li>It is explicitly stated that any hardware problems or concerns do not constitute a liability of Oqulix. The Licensee agrees to engage with the external hardware vendors for resolutions and acknowledges that Oqulix holds no responsibility for the performance or maintenance of the hardware.</li>
                        </ul>
                      </li>
                      <li><strong>Term and Termination:</strong>
                        <ul>
                          <li>This Agreement is effective upon acceptance and shall continue until terminated by either party. Either party may terminate this Agreement upon breach by the other party.</li>
                        </ul>
                      </li>
                      <li><strong>Limitation of Liability:</strong>
                        <ul>
                          <li>In no event shall Oqulix be liable for any indirect, incidental, special, consequential, or punitive damages arising out of or in connection with the use or inability to use the Happy Moves software.</li>
                        </ul>
                      </li>
                    </ol>`
                }}
              />
            </div>
          </div>
          <Footer />
        </div>

        {/* Page 6 */}
        <div className="page">
          <Header />
          <div className="main-page">
            <div className="main-page-heading">
              <div className="left"></div>
              <p>{formData.date || "Date"}</p>
            </div>

            <div className="license-agreement" style={{ marginTop: '20px' }}>
              <h2 style={{ textDecoration: "underline", textAlign: "center", marginBottom: '20px' }}>
                SOFTWARE LICENSE AGREEMENT
              </h2>
              <div 
                className="license-agreement-dynamic"
                dangerouslySetInnerHTML={{
                  __html: textData?.slaPage3 || `<ol start="10">
                      <li><strong>Annual Maintenance Contract (AMC):</strong>
                        <ul>
                          <li>After the completion of the initial three-year period, ongoing technical support will 
continue to be provided. However, access to new integrations, major feature 
additions, product enhancements, and future software updates will be covered under 
an optional Annual Maintenance Contract (AMC) of ₹45,000 per year</li>
                          <li>The AMC covers maintenance and support services, including bug fixes and technical assistance. However, it does not include software updates with new features, game additions, or major version upgrades. To access these updates, a separate subscription renewal or upgrade fee will be applicable.</li>
                        </ul>
                      </li>
                      <li><strong>Damages and Services:</strong>
                        <ul>
                          <li>The physical damages are not covered under warranty. Please note that physical damage to the hardware may result in data loss, for which OQULIX holds no liability. While we do not replace or repair damaged devices, we are happy to assist in guiding you to authorized vendors for suitable replacements.</li>
                          <li>The physical damages happening for the cabin are not covered under the 3 year unconditional warranty. The repairing charge should pay the hospital/clinic according to the bill amount.</li>
                        </ul>
                      </li>
                      <li><strong>Governing Law:</strong>
                        <ul>
                          <li>This Agreement shall be governed by and construed in accordance with the laws of [Jurisdiction]. Any disputes arising out of or in connection with this Agreement shall be resolved through arbitration in accordance with the rules of the [Arbitration Organization].</li>
                        </ul>
                      </li>
                      <li><strong>Miscellaneous:</strong>
                        <ul>
                          <li>This Agreement constitutes the entire understanding between the parties and supersedes all prior negotiations, understandings, or agreements.</li>
                          <li>Any modifications to this Agreement must be in writing and signed by both parties.</li>
                        </ul>
                      </li>
                    </ol>
                    <p style="font-size: 12px; text-align: center; margin-top: 20px;">Happymoves is a research-stage digital rehabilitation software currently undergoing clinical validation. It is intended solely for investigational use and may only be accessed, tested, or applied under the direct supervision of a licensed and certified physiotherapist or medical professional.</p>`
                }}
              />
            </div>
            <div className="sign">
              <h3>LICENSOR</h3>
              <h3>LICENSEE</h3>
            </div>
          </div>
          <Footer />
        </div>

        {/* Page 7 */}
        <div className="page">
          <Header />
          <div className="main-page">
            <div className="main-page-heading">
              <div className="left"></div>
              <p>{formData.date || "Date"}</p>
            </div>

            <div className="end-statement-div" style={{ marginTop: '20px' }}>
              <div>
                <h2 style={{ textDecoration: "underline", textAlign: "center", marginBottom: '20px' }}>
                  BANK ACCOUNT DETAILS
                </h2>
                <h3>Please find our bank details below for the payment:</h3>
                <div 
                  className="bank-details-dynamic" 
                  style={{ marginTop: '10px' }}
                  dangerouslySetInnerHTML={{
                    __html: textData?.bankDetails || `<ul>
                      <li>Bank Name: HDFC BANK</li>
                      <li>Account Holder: OQULIX PVT. LTD</li>
                      <li>Account Number: 50200090596672</li>
                      <li>IFSC Code: HDFC0004587</li>
                    </ul>`
                  }}
                />
              </div>

              <div className="end-statement">
                <div style={{ marginBottom: "12px" }}>
                  <h3 style={{ textDecoration: "underline", marginBottom: "6px" }}>
                    PAYMENT TERMS
                  </h3>
                </div>
                <div 
                  className="payment-terms-dynamic"
                  dangerouslySetInnerHTML={{
                    __html: textData?.paymentTerms || `<p><strong>Thank you for choosing Happy Moves for your therapeutic needs. We are excited about the prospect of contributing to the success of your firm. We kindly request an advance payment 50% of TOTAL PRICE for your confirmation and a balance payment 50% of TOTAL PRICE before the day of implementation.</strong></p>
                      <p style="margin-top: 10px;">Please make the payments within the specified timelines mentioned in the payment terms.</p>`
                  }}
                />
              </div>
            </div>
          </div>
          <Footer />
        </div>
      </div>
    </div>
  );
}
