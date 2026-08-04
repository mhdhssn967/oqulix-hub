import React, { useEffect, useRef } from "react";
import "./Mail.css";
import OQ from "../assets/OQ.png";
import seal from "../assets/seal.png";

const OneTimeMail = ({
  pageRefs,
  date,
  validUntil,
  name,
  institutionName,
  addressLine1,
  addressLine2,
  quantity,
  price,
  gstPrice,
  gstForOneYear,
  monthTotal,
  yearTotal,
  yearlyPrice,
  discount,
  discountedPrice,
  oneTimeGST,
  oneTimeTotal,
  complimentaryProducts,
  unitPrice
}) => {

  const priceSection=useRef(null)
  useEffect(() => {
  if (price) {
    priceSection.current?.scrollIntoView({ behavior: 'smooth' });
  }
}, [price]);

  return (
    <>
      <div className="container-mail-page">
        <h2>Page 1</h2>
        <div className="page" ref={(el) => (pageRefs.current[0] = el)}>
          <div className="mail-header">
            <img src={OQ} alt="" />
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
                <i className="fa-solid fa-phone"></i> +91 9447433005
                <br />
                <i className="fa-solid fa-envelope"></i> contact@oqulix.com
                <br />
                CIN: U62099KL2023PTC084540
              </p>
            </div>
          </div>
          
          <div className="main-page">
            <div className="main-page-heading">
              <div className="left">
                <h1>Quotation</h1>
                <p>Valid until {validUntil}</p>
              </div>
              <p>{date || "Date"}</p>
            </div>
            {/* to adress */}

            <p style={{ marginTop: "6px", fontWeight: 600,fontSize:'28px' }}>
              Special Quotation - Numbus Rehab Hospital
            </p>
            <div className="to-adress">
              <p>
                To, <br />
                <strong>{name || "Recipient Name"}</strong> <br /> 
                <strong>{institutionName || "Institution Name"}</strong> <br />
                {addressLine1 || "Address Line 1"} <br />
                {addressLine2 || "Address Line 2"}
              </p>
            </div>
            <div className="to-adress">
              <p>
                From, <br />
                <strong> OQULIX PVT. LTD</strong> <br />
                Suite 48M 1st Floor, A Square Building, <br />
                Edappally, Edathala P O, Ernakulam, Kerala <br />
                683561
              </p>
            </div>
        

            {/* mail */}
            <div className="mail-content">
              <p>Dear Team, </p>
              <p>
                It was a pleasure demonstrating our flagship product, <strong>Happy
                Moves</strong>, to you. We appreciate the
                opportunity to showcase how our innovative physiotherapy VR tool
                can enhance the rehabilitation experience for your patients,
                making their journey towards recovery more engaging and
                effective.
              </p>
              {/* <p>
                {" "}
                Please find the detailed quotation enclosed with this letter. We
                believe that this is a fantastic opportunity for the{" "}
                <span>{institutionName || "Institution Name"} </span> to
                integrate cutting-edge VR technology into your rehabilitation
                programs at an exceptional value. <br /> Thank you for
                considering our proposal.
              </p> */}
            </div>
            
            <div className="regards">
              <p>
                Regards <br />
                Team <strong>OQULIX</strong>
              </p>
              <div className="seal-div">
                <img className="seal-img" src={seal} alt="" />
              </div>
            </div>
          </div>

          <div className="page-footer">
            <a href="https://www.oqulix.com">www.oqulix.com</a>
          </div>
        </div>

        {/* page 2 */}
        <h2 >Page 2</h2>
        <div className="page" ref={(el) => (pageRefs.current[1] = el)} >
          <div className="mail-header" ref={priceSection}>
            <img src={OQ} alt="" />
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
                <i className="fa-solid fa-phone"></i> +91 9447433005
                <br />
                <i className="fa-solid fa-envelope"></i> contact@oqulix.com
                <br />
                CIN: U62099KL2023PTC084540
              </p>
            </div>
          </div>
          <div className="main-page">
            <div className="main-page-heading">
              <div className="left">
                <h1>Item Description</h1>
              </div>
              <p>{date || "Date"}</p>
            </div>

            <div className="quotation-table-div" >
              <table className="quotation-table">
                <thead>
                  <tr>
                    <th>ITEM</th>
                    <th>QTY</th>
                    {/* <th>PRICE FOR 1 MONTH</th> */}
                    <th>PRICE</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>HAPPY MOVES - STANDARD</td>
                    <td>{quantity || "Quantity"}</td>
                    {/* <td>{unitPrice || "Price"}</td> */}
                    {/* <td>{unitPrice || "Price"}</td> */}
                    <td>{price || "Total"}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            
  {complimentaryProducts.length > 0 && (
    <div className="quotation-table-div">
  <h3 style={{ textDecoration: "underline" }}>
    COMPLEMENTORY PRODUCTS
  </h3>
    <table className="quotation-table">
      <thead>
        <tr>
          <th>PRODUCT</th>
          <th>QTY</th>
        </tr>
      </thead>
      <tbody>
        {complimentaryProducts.map((item, index) => (
          <tr key={index}>
            <td>{item.productName}</td>
            <td>{item.productQuantity}</td>
          </tr>
        ))}
      </tbody>
    </table>
    </div>
  ) }
<div>
  {/* <p>Note: The hardware, including the Meta Quest VR headset, Android tablet, hygiene cleaning kit, or any other equipment, is not included. All hardware must be purchased entirely by the user. We will only provide the software, which will be installed on the devices purchased by the user.</p> */}
</div>

            <table className="total-table">
              <tbody>
                <tr>
                  <td>SUBTOTAL</td> <tr>INR {price}</tr>
                </tr>
                {discount != 0 && (
                  <>
                    <tr className="discount" >
                      <td>DISCOUNT</td> <tr>INR {discount}</tr>
                    </tr>
                    <tr className="discount-total">
                      <td>DISCOUNTED PRICE</td> <tr>INR {discountedPrice}</tr>
                    </tr>
                  </>
                )}
                <tr>
                  <td>GST 18%</td> <tr>INR {oneTimeGST}</tr>
                </tr>
                <tr className="total-price">
                  <td>TOTAL PRICE</td>
                  <td>INR {oneTimeTotal}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div className="page-footer">
            <a href="https://www.oqulix.com">www.oqulix.com</a>
          </div>
        </div>

        {/* Page 3: Special Quotation Note */}
        <h2>Page 3</h2>
        <div className="page" ref={(el) => (pageRefs.current[2] = el)}>
          <div className="mail-header">
            <img src={OQ} alt="" />
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
                <i className="fa-solid fa-phone"></i> +91 9447433005
                <br />
                <i className="fa-solid fa-envelope"></i> contact@oqulix.com
                <br />
                CIN: U62099KL2023PTC084540
              </p>
            </div>
          </div>
          <div className="main-page">
            <div className="main-page-heading">
              <div className="left">
                <p></p>
              </div>
              <p>{date || "Date"}</p>
            </div>

            <div className="license-agreement">
              <h2 style={{ textDecoration: "underline", textAlign: "center" }}>
                SPECIAL QUOTATION NOTE
              </h2>
              <p style={{ textAlign: "justify", lineHeight: 1.6 }}>
                This quotation is offered with a special discount because the hospital will support clinical validation of Happy Moves through actual patient use.
              </p>
              <p style={{ textAlign: "justify", lineHeight: 1.6 }}>
                We ask the hospital to share validation documentation, such as patient progress summaries and clinical observations, that show how the solution performs in practice.
              </p>
              <p style={{ textAlign: "justify", lineHeight: 1.6 }}>
                The hospital is also requested to provide videos or related content demonstrating the clinical use of the software, patient engagement, and therapy workflow.
              </p>
              <p style={{ textAlign: "justify", lineHeight: 1.6 }}>
                OQULIX will also prepare its own videos and materials for marketing and product communication, while following privacy and hospital guidelines.
              </p>
             
            </div>
          </div>
          <div className="page-footer">
            <a href="https://www.oqulix.com">www.oqulix.com</a>
          </div>
        </div>

        {/* page 4 */}
        <h2>Page 4</h2>
        <div className="page" ref={(el) => (pageRefs.current[3] = el)}>
          <div className="mail-header">
            <img src={OQ} alt="" />
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
                <i className="fa-solid fa-phone"></i> +91 9447433005
                <br />
                <i className="fa-solid fa-envelope"></i> contact@oqulix.com
                <br />
                CIN: U62099KL2023PTC084540
              </p>
            </div>
          </div>
          <div className="main-page">
            <div className="main-page-heading">
              <div className="left">
                <p></p>
              </div>
              <p>{date || "Date"}</p>
            </div>

            <div className="license-agreement">
              <h2 style={{ textDecoration: "underline", textAlign: "center" }}>
                SOFTWARE LICENSE AGREEMENT
              </h2>

              <p>
                <strong>Software License Agreement</strong> ("Agreement") is
                entered into between Oqulix, hereinafter referred to as
                "Licensor," and the entity or individual licensing the software,
                hereinafter referred to as "Licensee." This Agreement governs
                the use of the Happy Moves software.
              </p>
              <ol>
                <li>
                  <strong>License Grant:</strong>{" "}
                  <ul>
                    <li>
                      Subject to the terms and conditions of this Agreement,
                      Licensor grants Licensee a non-exclusive, non-transferable
                      license to use the Happy Moves software.
                    </li>
                  </ul>
                </li>

                <li>
                  <strong>Scope of Use:</strong>
                  <ul>
                    <li>
                      Happy Moves is not a healthcare product. It is intended
                      for rehabilitation, therapy, and wellness purposes.
                    </li>
                    <li>
                      Licensee acknowledges that Happy Moves is not a substitute
                      for professional healthcare advice, diagnosis, or
                      treatment.
                    </li>
                    <li>
                      Licensee acknowledges that if any problems arise during
                      the use of Happy Moves, Oqulix will not be held
                      responsible.
                    </li>
                    <li>
                      Licensee agrees to ensure that the software is used under
                      the guidance of a certified therapist or healthcare
                      professional.
                    </li>
                  </ul>
                </li>

                <li>
                  <strong>Feedback and Update Policy:</strong>
                  <ul>
                    <li>
                      Oqulix values client feedback and suggestions for
                      enhancing the Happy Moves software.
                    </li>
                    <li>
                      While Oqulix appreciates and considers all suggestions,
                      including those from hospitals, it is important to note
                      that not all suggestions will be implemented.
                    </li>
                    <li>
                      The company reserves the right to selectively incorporate
                      feedback into future updates, prioritizing based on
                      development needs and strategic considerations.
                    </li>
                  </ul>
                </li>

                <li>
                  <strong>Intellectual Property:</strong>{" "}
                  <ul>
                    <li>
                      The Happy Moves software, including all intellectual
                      property rights, remains the exclusive property of Oqulix.
                    </li>
                  </ul>
                </li>
              </ol>
            </div>
          </div>
          <div className="page-footer">
            <a href="https://www.oqulix.com">www.oqulix.com</a>
          </div>
        </div>

        {/* Page 5 */}
        <h2>Page 5</h2>
        <div className="page" ref={(el) => (pageRefs.current[4] = el)}>
          <div className="mail-header">
            <img src={OQ} alt="" />
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
                <i className="fa-solid fa-phone"></i> +91 9447433005
                <br />
                <i className="fa-solid fa-envelope"></i> contact@oqulix.com
                <br />
                CIN: U62099KL2023PTC084540
              </p>
            </div>
          </div>
          <div className="main-page">
            <div className="main-page-heading">
              <div className="left">
                <p></p>
              </div>
              <p>{date || "Date"}</p>
            </div>

            <div className="license-agreement">
              <h2 style={{ textDecoration: "underline", textAlign: "center" }}>
                SOFTWARE LICENSE AGREEMENT
              </h2>

              <ol start={5}>
                <li>
                  <strong>
                    Confidentiality of Pricing Details and Software Content:
                  </strong>
                  <ul>
                    <li>
                      Licensee agrees to maintain strict confidentiality
                      regarding the pricing details of the Happy Moves software,
                      as well as any offers or subsidies provided by Oqulix.
                      This information shall not be disclosed to any third
                      party, media, or on the internet.
                    </li>
                    <li>
                      Additionally, Licensee commits not to publish the software
                      content, including any proprietary information, to any
                      third party or third-party applications without the
                      explicit written consent of Oqulix.
                    </li>
                  </ul>
                </li>

                <li>
                  <strong>Protection Against Cloning:</strong>
                  <ul>
                    <li>
                      Licensee acknowledges that any attempts to clone,
                      reproduce, or replicate the Happy Moves software without
                      explicit authorization from Oqulix will be considered
                      malpractice.
                    </li>
                    <li>
                      In the event of unauthorized cloning, Licensee agrees to
                      pay compensation to Oqulix for damages incurred.
                    </li>
                    <li>
                      Oqulix reserves the right to pursue legal action to
                      protect its intellectual property rights.
                    </li>
                  </ul>
                </li>

                <li>
                  <strong>Customer Support:</strong>
                  <ul>
                    <li>
                      The VR Hardware is a complementary product. In case of
                      hardware-related issues, the Licensee shall seek
                      consultation and support directly from the external
                      hardware vendors. Oqulix will facilitate communication by
                      providing a designated channel for interaction between the
                      Licensee and the hardware vendors.
                    </li>
                    <li>
                      It is explicitly stated that any hardware problems or
                      concerns do not constitute a liability of Oqulix. The
                      Licensee agrees to engage with the external hardware
                      vendors for resolutions and acknowledges that Oqulix holds
                      no responsibility for the performance or maintenance of
                      the hardware.
                    </li>
                  </ul>
                </li>

                <li>
                  <strong>Term and Termination:</strong>{" "}
                  <ul>
                    <li>
                      This Agreement is effective upon acceptance and shall
                      continue until terminated by either party. Either party
                      may terminate this Agreement upon breach by the other
                      party.
                    </li>
                  </ul>
                </li>

                <li>
                  <strong>Limitation of Liability:</strong>
                  <ul>
                    <li>
                      In no event shall Oqulix be liable for any indirect,
                      incidental, special, consequential, or punitive damages
                      arising out of or in connection with the use or inability
                      to use the Happy Moves software.
                    </li>
                  </ul>
                </li>
              </ol>
            </div>
          </div>
          <div className="page-footer">
            <a href="https://www.oqulix.com">www.oqulix.com</a>
          </div>
        </div>

        {/* Page 6 */}
        <h2>Page 6</h2>
        <div className="page" ref={(el) => (pageRefs.current[5] = el)}>
          <div className="mail-header">
            <img src={OQ} alt="" />
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
                <i className="fa-solid fa-phone"></i> +91 9447433005
                <br />
                <i className="fa-solid fa-envelope"></i> contact@oqulix.com
                <br />
                CIN: U62099KL2023PTC084540
              </p>
            </div>
          </div>
          <div className="main-page">
            <div className="main-page-heading">
              <div className="left">
                <p></p>
              </div>
              <p>{date || "Date"}</p>
            </div>

            <div className="license-agreement">
              <h2 style={{ textDecoration: "underline", textAlign: "center" }}>
                SOFTWARE LICENSE AGREEMENT
              </h2>

              <ol start={10}>
                <li>
                  <strong>Annual Maintenance Contract (AMC):</strong>
                  <ul>
                    <li>
                      The Annual Maintenance Contract (AMC) for the software
                      will be charged after the period of 3 year.
                      The AMC amount is ₹45,000 per annum. Please
                      note that the AMC charge is independent of any discounts
                      provided on the software price.
                    </li>
                    <li>
                      The AMC covers maintenance and support services, including
                      bug fixes and technical assistance. However, it does not
                      include software updates with new features, game
                      additions, or major version upgrades. To access these
                      updates, a separate subscription renewal or upgrade fee
                      will be applicable.
                    </li>
                  </ul>
                </li>

                <li>
                  <strong>Damages and Services:</strong>
                  <ul>
                    <li>
                      The physical damages are not covered under warranty.
                      Please note that physical damage to the hardware may
                      result in data loss, for which OQULIX holds no liability.
                      While we do not replace or repair damaged devices, we are
                      happy to assist in guiding you to authorized vendors for
                      suitable replacements.
                    </li>
                    <li>
                      The physical damages happening for the cabin are not
                      covered under the 3 year unconditional warranty. The
                      repairing charge should pay the hospital/clinic according
                      to the bill amount.
                    </li>
                  </ul>
                </li>
                <li>
                  <strong>Governing Law:</strong>
                  <ul>
                    <li>
                      This Agreement shall be governed by and construed in
                      accordance with the laws of [Jurisdiction]. Any disputes
                      arising out of or in connection with this Agreement shall
                      be resolved through arbitration in accordance with the
                      rules of the [Arbitration Organization].
                    </li>
                  </ul>
                </li>
                <li>
                  <strong>Miscellaneous:</strong>
                  <ul>
                    <li>
                      This Agreement constitutes the entire understanding
                      between the parties and supersedes all prior negotiations,
                      understandings, or agreements.
                    </li>
                    <li>
                      {" "}
                      Any modifications to this Agreement must be in writing and
                      signed by both parties.
                    </li>
                  </ul>
                </li>
                <p style={{fontSize:'12px',textAlign:'center'}}>Happymoves is a research-stage digital rehabilitation software currently undergoing clinical validation. It is intended solely for investigational use and may only be accessed, tested, or applied under the direct supervision of a licensed and certified physiotherapist or medical professional.</p>
              </ol>
            </div>
            <div className="sign"><h3>LICENSOR</h3>
            <h3>LICENSEE</h3>
            </div>
          </div>
          <div className="page-footer">
            <a href="https://www.oqulix.com">www.oqulix.com</a>
          </div>
        </div>

        {/* Page 7 */}

        <h2>Page 7</h2>
        <div className="page" ref={(el) => (pageRefs.current[6] = el)}>
          <div className="mail-header">
            <img src={OQ} alt="" />
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
                <i className="fa-solid fa-phone"></i> +91 9447433005
                <br />
                <i className="fa-solid fa-envelope"></i> contact@oqulix.com
                <br />
                CIN: U62099KL2023PTC084540
              </p>
            </div>
          </div>
          <div className="main-page">
            <div className="main-page-heading">
              <div className="left">
                <p></p>
              </div>
              <p>{date || "Date"}</p>
            </div>

            <div className="license-agreement end-statement-div">
              <div>
                <h2
                  style={{ textDecoration: "underline", textAlign: "center" }}
                >
                  BANK ACCOUNT DETAILS
                </h2>
                <h3>Please find our bank details below for the payment</h3>
                <ul className="bank-details">
                  <li>- Bank Name: HDFC BANK</li>
                  <li>- Account Holder: OQULIX PVT. LTD</li>
                  <li>- Account Number: 50200090596672</li>
                  <li>- IFSC Code: HDFC0004587</li>
                </ul>
              </div>

             <div className="end-statement">
                <div style={{ marginBottom: "12px" }}>
                  <h3 style={{ textDecoration: "underline", marginBottom: "6px" }}>
                    PAYMENT TERMS
                  </h3>
           
                </div>
                <p>
                  <strong>
                    Thank you for choosing Happy Moves for your therapeutic needs. We are excited about the prospect of contributing to the success of your firm. We kindly request an advance payment 50% of TOTAL PRICE for your confirmation and a balance payment 50% of TOTAL PRICE before the day of implementation.
                  </strong>
                </p>
                <p>
                  Please make the payments within the specified timelines
                  mentioned in the payment terms.
                </p>
              </div>


            </div>
          </div>
          <div className="page-footer">
            <a href="https://www.oqulix.com">www.oqulix.com</a>
          </div>
        </div>
      </div>
    </>
  );
};

export default OneTimeMail;
