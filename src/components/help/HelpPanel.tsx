import { useState } from 'react';
import { 
  HelpCircle, 
  BookOpen, 
  Sliders, 
  FileDown, 
  Lock,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

export function HelpPanel() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const faqs = [
    {
      q: "Where is my Excel data uploaded?",
      a: "Nowhere! The application is fully serverless and runs entirely client-side. The files you select are parsed in the browser memory using SheetJS and cached inside your local IndexedDB storage. You can safely run this application offline without any internet connection."
    },
    {
      q: "How does the column data type detection work?",
      a: "When you upload a workbook, the application analyzes a representative sample of up to 1,000 rows. It automatically infers whether a column represents dates, numeric figures, currencies, percentage ratios, low-cardinality categories, or free text, setting up appropriate analytics card values automatically."
    },
    {
      q: "What is the maximum file size supported?",
      a: "By default, the offline parser is configured to accept files up to 50MB. Since parsing happens in the browser's JavaScript engine, very large sheets might consume significant system memory. The application uses row sampling to keep processing smooth and fast."
    },
    {
      q: "How can I sort or reorder columns?",
      a: "In the Data Table view, click any column header to sort the sheet. You can drag and drop column headers to change their horizontal order. Check column widths or toggle visibility in the 'Columns' dropdown."
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fade-in">
      
      {/* FAQ & Support Section */}
      <div className="md:col-span-2 space-y-5">
        <div className="bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-800 p-6 rounded-dashboard shadow-dashboard space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
            <HelpCircle className="h-4.5 w-4.5 text-primary" />
            <h4 className="text-[13px] font-bold text-slate-850 dark:text-white font-semibold">
              Frequently Asked Questions
            </h4>
          </div>
          <div className="space-y-3">
            {faqs.map((faq, i) => (
              <div 
                key={i} 
                className="border border-slate-100 dark:border-slate-850 rounded-xl overflow-hidden"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex justify-between items-center p-4 bg-slate-50/40 hover:bg-slate-50 dark:bg-slate-900/60 dark:hover:bg-slate-850 text-left text-xs font-semibold text-slate-705 dark:text-slate-250 cursor-pointer transition-colors"
                >
                  <span>{faq.q}</span>
                  {openFaq === i ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
                {openFaq === i && (
                  <div className="p-4 bg-white dark:bg-slate-900 text-xs text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-850/60 leading-relaxed">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Guide Cards */}
      <div className="space-y-6">
        <div className="bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-800 p-6 rounded-dashboard shadow-dashboard space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
            <BookOpen className="h-4.5 w-4.5 text-primary" />
            <h4 className="text-[13px] font-bold text-slate-850 dark:text-white font-semibold">
              Data Quality Guide
            </h4>
          </div>
          <div className="space-y-3 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
            <div className="flex gap-2">
              <div className="h-2 w-2 rounded-full bg-emerald-500 mt-1.5 flex-shrink-0" />
              <p>Keep column headers in the very first row of your Excel sheets for auto-detection.</p>
            </div>
            <div className="flex gap-2">
              <div className="h-2 w-2 rounded-full bg-blue-500 mt-1.5 flex-shrink-0" />
              <p>Ensure date fields match standardized formats like YYYY-MM-DD or MM/DD/YYYY.</p>
            </div>
            <div className="flex gap-2">
              <div className="h-2 w-2 rounded-full bg-amber-500 mt-1.5 flex-shrink-0" />
              <p>Blank cells will be marked as missing cells in the automated dashboard profile warnings.</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-800 p-6 rounded-dashboard shadow-dashboard space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
            <Lock className="h-4.5 w-4.5 text-emerald-500" />
            <h4 className="text-[13px] font-bold text-slate-850 dark:text-white font-semibold">
              Security Compliance
            </h4>
          </div>
          <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">
            This dashboard runs entirely within your browser environment sandbox. We do not transmit telemetry, logs, API queries, or spreadsheet data over the network, making it compliant with strict organizational data policies.
          </p>
        </div>
      </div>

    </div>
  );
}
