import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { toast } from '../components/ui/Toast';

export const exporters = {
  exportToCSV(
    rows: any[], 
    headers: string[], 
    filename: string, 
    headerMappings?: { [key: string]: string }, 
    useDisplayHeaders = false
  ) {
    try {
      const displayHeaders = useDisplayHeaders && headerMappings
        ? headers.map(h => headerMappings[h] || h)
        : headers;

      const csvRows = [
        displayHeaders.join(','), // headers row
        ...rows.map(row => 
          headers.map(h => {
            const val = String(row[h] !== undefined && row[h] !== null ? row[h] : '').replace(/"/g, '""');
            return `"${val}"`;
          }).join(',')
        )
      ];

      const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `${filename.split('.')[0]}_export.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("CSV file exported successfully!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to export CSV file");
    }
  },

  exportToExcel(
    rows: any[], 
    sheetName: string, 
    filename: string,
    headers?: string[],
    headerMappings?: { [key: string]: string },
    useDisplayHeaders = false
  ) {
    try {
      // Clean rows of internal metadata & map keys if needed
      const cleanedRows = rows.map(r => {
        const copy = { ...r };
        delete copy._originalIndex;
        
        if (useDisplayHeaders && headerMappings && headers) {
          const mappedRow: any = {};
          headers.forEach(h => {
            const displayName = headerMappings[h] || h;
            mappedRow[displayName] = copy[h];
          });
          return mappedRow;
        }
        
        return copy;
      });

      const worksheet = XLSX.utils.json_to_sheet(cleanedRows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
      
      const outFilename = `${filename.split('.')[0]}_${sheetName}_export.xlsx`;
      XLSX.writeFile(workbook, outFilename);
      toast.success("Excel workbook exported successfully!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to export Excel file");
    }
  },

  exportToPDF(
    rows: any[], 
    headers: string[], 
    sheetName: string, 
    filename: string,
    headerMappings?: { [key: string]: string },
    useDisplayHeaders = false
  ) {
    try {
      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'pt',
        format: 'a4'
      });

      doc.setFontSize(16);
      doc.text(`Sheet Export: ${sheetName}`, 40, 40);
      doc.setFontSize(10);
      doc.text(`Source File: ${filename} | Date: ${new Date().toLocaleDateString()}`, 40, 55);

      const displayHeaders = useDisplayHeaders && headerMappings
        ? headers.map(h => headerMappings[h] || h)
        : headers;

      // Clean metadata from rows
      const tableData = rows.map(row => headers.map(h => String(row[h] !== undefined && row[h] !== null ? row[h] : '')));

      autoTable(doc, {
        head: [displayHeaders],
        body: tableData,
        startY: 70,
        styles: { fontSize: 8, cellPadding: 4, overflow: 'ellipsize' },
        headStyles: { fillColor: [37, 99, 235], textColor: [255, 255, 255], fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        margin: { left: 40, right: 40 }
      });

      const outFilename = `${filename.split('.')[0]}_${sheetName}_export.pdf`;
      doc.save(outFilename);
      toast.success("PDF report generated successfully!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to generate PDF report");
    }
  }
};
