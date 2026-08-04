import React, { useState } from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';

export default function DocumentTextEditor({ initialTexts, onSave, onBack }) {
  const [texts, setTexts] = useState(initialTexts || {
    coverLetter: `<p>It was a pleasure demonstrating our flagship product, <strong>Happy Moves</strong>, to you. We appreciate the opportunity to showcase how our innovative physiotherapy VR tool can enhance the rehabilitation experience for your patients, making their journey towards recovery more engaging and effective.</p>`,
    slaPage1: `<p><strong>Software License Agreement</strong> ("Agreement") is entered into between Oqulix, hereinafter referred to as "Licensor," and the entity or individual licensing the software, hereinafter referred to as "Licensee." This Agreement governs the use of the Happy Moves software.</p>
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
      </ol>`,
    slaPage2: `<ol start="5">
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
      </ol>`,
    slaPage3: `<ol start="10">
        <li><strong>Annual Maintenance Contract (AMC):</strong>
          <ul>
            <li> After the completion of the initial three-year period, ongoing technical support will 
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
      <p style="font-size: 12px; text-align: center; margin-top: 20px;">Happymoves is a research-stage digital rehabilitation software currently undergoing clinical validation. It is intended solely for investigational use and may only be accessed, tested, or applied under the direct supervision of a licensed and certified physiotherapist or medical professional.</p>`,
    bankDetails: `<ul>
        <li>Bank Name: HDFC BANK</li>
        <li>Account Holder: OQULIX PVT. LTD</li>
        <li>Account Number: 50200090596672</li>
        <li>IFSC Code: HDFC0004587</li>
      </ul>`,
    paymentTerms: `<p><strong>Thank you for choosing Happy Moves for your therapeutic needs. We are excited about the prospect of contributing to the success of your firm. We kindly request an advance payment 50% of TOTAL PRICE for your confirmation and a balance payment 50% of TOTAL PRICE before the day of implementation.</strong></p>
      <p>Please make the payments within the specified timelines mentioned in the payment terms.</p>`
  });

  const modules = {
    toolbar: [
      ['bold', 'italic', 'underline'],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      ['clean']
    ],
  };

  const handleChange = (key, value) => {
    setTexts(prev => ({ ...prev, [key]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(texts);
  };

  return (
    <div className="w-full max-w-4xl mx-auto pb-20">
      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* Cover Letter */}
        <div className="bg-white rounded-2xl border border-zinc-200/80 shadow-[0_2px_12px_rgba(0,0,0,0.03)] overflow-hidden">
          <div className="bg-zinc-50/50 px-6 py-4 border-b border-zinc-100">
            <h2 className="text-sm font-bold text-zinc-800 uppercase tracking-wider">Cover Letter</h2>
          </div>
          <div className="p-6">
            <ReactQuill theme="snow" modules={modules} value={texts.coverLetter} onChange={(val) => handleChange('coverLetter', val)} className="bg-white" />
          </div>
        </div>

        {/* SLA Page 1 */}
        <div className="bg-white rounded-2xl border border-zinc-200/80 shadow-[0_2px_12px_rgba(0,0,0,0.03)] overflow-hidden">
          <div className="bg-zinc-50/50 px-6 py-4 border-b border-zinc-100">
            <h2 className="text-sm font-bold text-zinc-800 uppercase tracking-wider">SLA - Page 1</h2>
          </div>
          <div className="p-6">
            <ReactQuill theme="snow" modules={modules} value={texts.slaPage1} onChange={(val) => handleChange('slaPage1', val)} className="bg-white" />
          </div>
        </div>

        {/* SLA Page 2 */}
        <div className="bg-white rounded-2xl border border-zinc-200/80 shadow-[0_2px_12px_rgba(0,0,0,0.03)] overflow-hidden">
          <div className="bg-zinc-50/50 px-6 py-4 border-b border-zinc-100">
            <h2 className="text-sm font-bold text-zinc-800 uppercase tracking-wider">SLA - Page 2</h2>
          </div>
          <div className="p-6">
            <ReactQuill theme="snow" modules={modules} value={texts.slaPage2} onChange={(val) => handleChange('slaPage2', val)} className="bg-white" />
          </div>
        </div>

        {/* SLA Page 3 */}
        <div className="bg-white rounded-2xl border border-zinc-200/80 shadow-[0_2px_12px_rgba(0,0,0,0.03)] overflow-hidden">
          <div className="bg-zinc-50/50 px-6 py-4 border-b border-zinc-100">
            <h2 className="text-sm font-bold text-zinc-800 uppercase tracking-wider">SLA - Page 3</h2>
          </div>
          <div className="p-6">
            <ReactQuill theme="snow" modules={modules} value={texts.slaPage3} onChange={(val) => handleChange('slaPage3', val)} className="bg-white" />
          </div>
        </div>

        {/* Bank & Payment Terms */}
        <div className="bg-white rounded-2xl border border-zinc-200/80 shadow-[0_2px_12px_rgba(0,0,0,0.03)] overflow-hidden">
          <div className="bg-zinc-50/50 px-6 py-4 border-b border-zinc-100">
            <h2 className="text-sm font-bold text-zinc-800 uppercase tracking-wider">Bank Details & Payment Terms</h2>
          </div>
          <div className="p-6 space-y-6">
            <div>
              <label className="block text-xs font-semibold text-zinc-500 uppercase mb-2">Bank Details</label>
              <ReactQuill theme="snow" modules={modules} value={texts.bankDetails} onChange={(val) => handleChange('bankDetails', val)} className="bg-white" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-500 uppercase mb-2">Payment Terms Paragraph</label>
              <ReactQuill theme="snow" modules={modules} value={texts.paymentTerms} onChange={(val) => handleChange('paymentTerms', val)} className="bg-white" />
            </div>
          </div>
        </div>

        <div className="flex justify-between pt-4">
          <button 
            type="button"
            onClick={onBack}
            className="flex items-center gap-2 px-6 py-3 bg-white text-zinc-700 border border-zinc-200 rounded-xl text-sm font-semibold hover:bg-zinc-50 transition-all shadow-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <button 
            type="submit"
            className="flex items-center gap-2 px-8 py-3 bg-black text-white rounded-xl text-sm font-semibold hover:bg-zinc-800 hover:shadow-md hover:-translate-y-0.5 transition-all"
          >
            Preview Document
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
}
