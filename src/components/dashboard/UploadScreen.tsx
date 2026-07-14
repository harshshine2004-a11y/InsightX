import React, { useState, useEffect, useRef } from 'react';
import { 
  Upload, 
  FileText, 
  FileSpreadsheet,
  AlertCircle, 
  CheckCircle2, 
  Trash2, 
  Clock, 
  BarChart, 
  Layers,
  ArrowRight,
  Database,
  Plus
} from 'lucide-react';
import { parseExcelFile, ParseResult } from '../../utils/excelParser';
import { dbService, WorkbookFile } from '../../services/db';
import { toast } from '../ui/Toast';

interface UploadScreenProps {
  onUploadSuccess: (workbook: WorkbookFile) => void;
  activeWorkbook: WorkbookFile | null;
}

const MAX_FILE_SIZE_MB = 50; // Configurable limit

export function UploadScreen({ onUploadSuccess, activeWorkbook }: UploadScreenProps) {
  const [dragActive, setDragActive] = useState(false);
  const [uploadState, setUploadState] = useState<'idle' | 'processing' | 'summary'>('idle');
  const [progressStep, setProgressStep] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParseResult | null>(null);
  const [recentFiles, setRecentFiles] = useState<WorkbookFile[]>([]);
  const [processingTime, setProcessingTime] = useState(0);
  const [showReplaceModal, setShowReplaceModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const progressSteps = [
    "Reading Workbook...",
    "Detecting Sheets...",
    "Analyzing Data...",
    "Detecting Column Types...",
    "Generating Dashboard...",
    "Almost Ready...",
    "Dashboard Ready"
  ];

  // Load recent files on mount
  useEffect(() => {
    loadRecentFiles();
  }, []);

  const loadRecentFiles = async () => {
    try {
      const files = await dbService.getAllWorkbooks();
      setRecentFiles(files);
    } catch (err) {
      console.error("Failed to load recent files:", err);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const validateFile = (file: File): string | null => {
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext !== 'xlsx' && ext !== 'xls') {
      return "Unsupported file format. Please upload a .xlsx or .xls Excel workbook.";
    }
    if (file.size === 0) {
      return "The uploaded file is empty.";
    }
    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      return `File exceeds the maximum limit of ${MAX_FILE_SIZE_MB}MB.`;
    }
    return null;
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      processFileSelection(file);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      processFileSelection(file);
    }
  };

  const processFileSelection = (file: File) => {
    const errorMsg = validateFile(file);
    if (errorMsg) {
      toast.error(errorMsg);
      return;
    }

    setSelectedFile(file);

    // If there is already an active workbook in memory, ask what to do
    if (activeWorkbook) {
      setShowReplaceModal(true);
    } else {
      startImport(file, false);
    }
  };

  const startImport = async (file: File, addToDataset = false) => {
    setShowReplaceModal(false);
    setUploadState('processing');
    setProgressStep(0);
    
    const startTime = performance.now();
    
    // Simulate steps visually for smooth professional experience
    const runProgressSimulation = () => {
      return new Promise<void>((resolve) => {
        let currentStep = 0;
        const interval = setInterval(() => {
          currentStep++;
          if (currentStep < progressSteps.length - 1) {
            setProgressStep(currentStep);
          } else {
            clearInterval(interval);
            resolve();
          }
        }, 300); // 300ms per step simulation
      });
    };

    try {
      // Parse file
      const parsePromise = parseExcelFile(file);
      await runProgressSimulation();
      
      const result = await parsePromise;
      const endTime = performance.now();
      setProcessingTime(Math.round(endTime - startTime));
      setParsedData(result);
      
      setProgressStep(progressSteps.length - 1);
      
      // Delay briefly to show "Dashboard Ready" state before displaying summary
      setTimeout(() => {
        setUploadState('summary');
      }, 500);
    } catch (err) {
      console.error(err);
      toast.error("Failed to parse Excel file. It may be corrupted or password protected.");
      setUploadState('idle');
    }
  };

  const handleOpenDashboard = async () => {
    if (!parsedData) return;

    try {
      const newWorkbook: WorkbookFile = {
        id: parsedData.filename, // Use filename as unique id
        filename: parsedData.filename,
        size: parsedData.size,
        uploadedAt: Date.now(),
        lastOpened: Date.now(),
        sheets: parsedData.sheets,
        summary: {
          totalSheets: parsedData.totalSheets,
          totalRecords: parsedData.totalRecords,
          qualityScore: parsedData.qualityScore,
          dateColumnsCount: parsedData.dateColumnsCount,
          numericColumnsCount: parsedData.numericColumnsCount,
          categoryColumnsCount: parsedData.categoryColumnsCount
        }
      };

      // Save to IndexedDB
      await dbService.saveWorkbook(newWorkbook);
      await dbService.savePreference('lastOpenedWorkbookId', newWorkbook.id);
      
      toast.success("Workbook loaded successfully!");
      
      // Notify parent
      onUploadSuccess(newWorkbook);
    } catch (err) {
      console.error(err);
      toast.error("Failed to store dataset in local database.");
    }
  };

  const handleReopenFile = async (id: string) => {
    try {
      const workbook = await dbService.getWorkbook(id);
      if (workbook) {
        workbook.lastOpened = Date.now();
        await dbService.saveWorkbook(workbook);
        await dbService.savePreference('lastOpenedWorkbookId', workbook.id);
        toast.success(`Reopened ${workbook.filename}`);
        onUploadSuccess(workbook);
      } else {
        toast.error("File not found in local database.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error reopening file.");
    }
  };

  const handleDeleteFile = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this dataset from offline storage?")) return;
    
    try {
      await dbService.deleteWorkbook(id);
      toast.success("File deleted from local database.");
      loadRecentFiles();
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete file.");
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 bg-slate-50 dark:bg-slate-950/60 overflow-y-auto no-scrollbar">
      {/* Upload Card container */}
      <div className="w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-dashboard shadow-dashboard p-8 transition-all duration-300">
        
        {uploadState === 'idle' && (
          <div className="space-y-6">
            {/* Header */}
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold text-slate-800 dark:text-white tracking-tight">
                Import Spreadsheet Data
              </h2>
              <p className="text-[13px] text-slate-500 dark:text-slate-400">
                All file parsing and storage happens completely offline. No data is sent to any server.
              </p>
            </div>

            {/* Drag Area */}
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-dashboard p-10 flex flex-col items-center justify-center gap-4 cursor-pointer transition-all duration-300 ${
                dragActive
                  ? 'border-primary bg-primary/5 dark:bg-primary/10 animate-pulse-border'
                  : 'border-slate-250 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 hover:bg-slate-100/50 dark:hover:bg-slate-850/50'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept=".xlsx,.xls"
                onChange={handleFileInput}
              />
              <div className="p-4 rounded-full bg-white dark:bg-slate-800 shadow-sm text-primary flex items-center justify-center border border-slate-100 dark:border-slate-700">
                <Upload className="h-6 w-6" />
              </div>
              <div className="text-center space-y-1.5">
                <p className="text-[14px] font-semibold text-slate-700 dark:text-slate-200">
                  {dragActive ? "Drop your Excel file here" : "Drag & drop your Excel workbook here"}
                </p>
                <p className="text-[12px] text-slate-400 dark:text-slate-500">
                  or click anywhere to browse local files
                </p>
              </div>
              <div className="text-[11px] font-medium text-slate-400 dark:text-slate-500 bg-slate-200/50 dark:bg-slate-800 px-3 py-1 rounded-full">
                Supports Excel (.xlsx, .xls) up to {MAX_FILE_SIZE_MB}MB
              </div>
            </div>

            {/* Recent Files Section */}
            {recentFiles.length > 0 && (
              <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                  Recent Offline Files
                </h3>
                <div className="grid gap-2.5 max-h-[220px] overflow-y-auto pr-1">
                  {recentFiles.slice(0, 4).map((file) => (
                    <div
                      key={file.id}
                      onClick={() => handleReopenFile(file.id)}
                      className="group flex items-center justify-between p-3.5 border border-slate-200 dark:border-slate-800 hover:border-slate-350 dark:hover:border-slate-700 rounded-xl bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800/80 cursor-pointer transition-all duration-150"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500 flex-shrink-0">
                          <FileSpreadsheet className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[13px] font-semibold text-slate-700 dark:text-slate-200 truncate pr-2">
                            {file.filename}
                          </p>
                          <p className="text-[11px] text-slate-400 dark:text-slate-500 flex items-center gap-2 mt-0.5">
                            <span>{formatFileSize(file.size)}</span>
                            <span>•</span>
                            <span>{file.summary.totalRecords.toLocaleString()} rows</span>
                            <span>•</span>
                            <span className="flex items-center gap-0.5">
                              <Clock className="h-3 w-3" />
                              {new Date(file.lastOpened).toLocaleDateString()}
                            </span>
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => handleDeleteFile(file.id, e)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-colors"
                          title="Delete dataset"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                        <div className="p-1.5 text-primary">
                          <ArrowRight className="h-4 w-4" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Processing State */}
        {uploadState === 'processing' && (
          <div className="flex flex-col items-center justify-center py-10 space-y-6 animate-fade-in">
            {/* Spinning Loader */}
            <div className="relative flex items-center justify-center">
              <div className="w-16 h-16 border-4 border-slate-100 dark:border-slate-800 rounded-full"></div>
              <div className="absolute w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
              <Database className="absolute h-6 w-6 text-primary" />
            </div>

            <div className="text-center space-y-2 w-full max-w-sm">
              <h3 className="text-lg font-bold text-slate-800 dark:text-white">
                Processing Spreadsheet
              </h3>
              
              {/* Micro progress line */}
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                <div 
                  className="bg-primary h-full transition-all duration-300"
                  style={{ width: `${((progressStep + 1) / progressSteps.length) * 100}%` }}
                ></div>
              </div>

              {/* Step indicator */}
              <div className="text-xs text-slate-400 dark:text-slate-500 font-semibold h-4 mt-2">
                {progressSteps[progressStep]}
              </div>
            </div>
          </div>
        )}

        {/* Summary Screen */}
        {uploadState === 'summary' && parsedData && (
          <div className="space-y-6 animate-fade-in">
            {/* Success Heading */}
            <div className="flex items-center gap-3 pb-4 border-b border-slate-150 dark:border-slate-850">
              <div className="p-2 rounded-full bg-emerald-500/10 text-emerald-500 flex-shrink-0">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-800 dark:text-white">
                  Workbook Analysis Completed
                </h3>
                <p className="text-[12px] text-slate-400">
                  Ready in {processingTime}ms offline
                </p>
              </div>
            </div>

            {/* Workbook Summary Stats Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 border border-slate-150 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40 rounded-xl">
                <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">File Name</p>
                <p className="text-sm font-bold text-slate-700 dark:text-slate-200 mt-1 truncate">{parsedData.filename}</p>
              </div>
              <div className="p-4 border border-slate-150 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40 rounded-xl">
                <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">File Size</p>
                <p className="text-sm font-bold text-slate-700 dark:text-slate-200 mt-1">{formatFileSize(parsedData.size)}</p>
              </div>
              <div className="p-4 border border-slate-150 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40 rounded-xl">
                <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Total Sheets</p>
                <p className="text-sm font-bold text-slate-700 dark:text-slate-200 mt-1 flex items-center gap-1.5">
                  <Layers className="h-4 w-4 text-slate-400" />
                  {parsedData.totalSheets}
                </p>
              </div>
              <div className="p-4 border border-slate-150 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40 rounded-xl">
                <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Total Records</p>
                <p className="text-sm font-bold text-slate-700 dark:text-slate-200 mt-1 flex items-center gap-1.5">
                  <Database className="h-4 w-4 text-slate-400" />
                  {parsedData.totalRecords.toLocaleString()}
                </p>
              </div>
            </div>

            {/* Quality Score and Profile Breakdown */}
            <div className="p-4 border border-slate-150 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40 rounded-xl space-y-4">
              <div>
                <div className="flex justify-between items-center text-xs font-semibold mb-1">
                  <span className="text-slate-500 dark:text-slate-400">Data Integrity Quality Score</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] ${
                    parsedData.qualityScore > 85 
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' 
                      : parsedData.qualityScore > 60 
                      ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400' 
                      : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                  }`}>{parsedData.qualityScore}%</span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div 
                    className={`h-full ${
                      parsedData.qualityScore > 85 
                        ? 'bg-emerald-500' 
                        : parsedData.qualityScore > 60 
                        ? 'bg-amber-500' 
                        : 'bg-rose-500'
                    }`}
                    style={{ width: `${parsedData.qualityScore}%` }}
                  ></div>
                </div>
              </div>

              {/* Column profile counts */}
              <div className="grid grid-cols-3 gap-2 text-center pt-2">
                <div className="p-2 border border-slate-150/40 dark:border-slate-800/40 bg-white dark:bg-slate-900 rounded-lg">
                  <span className="text-[10px] font-semibold text-slate-400">Date Columns</span>
                  <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{parsedData.dateColumnsCount}</p>
                </div>
                <div className="p-2 border border-slate-150/40 dark:border-slate-800/40 bg-white dark:bg-slate-900 rounded-lg">
                  <span className="text-[10px] font-semibold text-slate-400">Numeric Columns</span>
                  <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{parsedData.numericColumnsCount}</p>
                </div>
                <div className="p-2 border border-slate-150/40 dark:border-slate-800/40 bg-white dark:bg-slate-900 rounded-lg">
                  <span className="text-[10px] font-semibold text-slate-400">Categories</span>
                  <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{parsedData.categoryColumnsCount}</p>
                </div>
              </div>
            </div>

            {/* Launch button */}
            <div className="flex gap-3">
              <button
                onClick={() => setUploadState('idle')}
                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-[13px] font-semibold text-slate-600 dark:text-slate-300 transition-colors"
              >
                Upload Different File
              </button>
              <button
                onClick={handleOpenDashboard}
                className="flex-1 bg-primary hover:bg-primary-dark text-white px-4 py-2.5 rounded-xl text-[13px] font-semibold flex items-center justify-center gap-1.5 shadow-sm transition-all"
              >
                <span>Open Dashboard</span>
                <ArrowRight className="h-4.5 w-4.5" />
              </button>
            </div>
          </div>
        )}

      </div>

      {/* Replace dataset confirmation modal */}
      {showReplaceModal && selectedFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-dashboard shadow-2xl p-6 space-y-5">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-full bg-amber-500/10 text-amber-500 flex-shrink-0">
                <AlertCircle className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <h4 className="font-bold text-slate-800 dark:text-white text-[15px]">
                  Confirm Workbook Import
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  You are opening a new spreadsheet. Do you want to replace the current active dataset or add this file as a new dataset in your history?
                </p>
              </div>
            </div>

            <div className="text-[12px] bg-slate-50 dark:bg-slate-850 p-3 rounded-lg border border-slate-100 dark:border-slate-800">
              <p className="font-semibold text-slate-600 dark:text-slate-350">New Workbook:</p>
              <p className="font-bold text-slate-800 dark:text-slate-100 mt-0.5 truncate">{selectedFile.name}</p>
            </div>

            <div className="flex flex-col gap-2">
              <button
                onClick={() => startImport(selectedFile, false)}
                className="w-full bg-primary hover:bg-primary-dark text-white py-2 rounded-xl text-xs font-semibold shadow-sm transition-all"
              >
                Replace Active Dataset & Load
              </button>
              <button
                onClick={() => startImport(selectedFile, true)}
                className="w-full border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 py-2 rounded-xl text-xs font-semibold transition-colors"
              >
                Add as New Dataset (Keep Active)
              </button>
              <button
                onClick={() => {
                  setShowReplaceModal(false);
                  setSelectedFile(null);
                }}
                className="w-full text-center text-xs font-semibold text-slate-400 hover:text-slate-650 mt-1 py-1"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
