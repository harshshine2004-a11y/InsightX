import React, { useRef, useState } from 'react';
import { Maximize2, Minimize2, Download } from 'lucide-react';
import { toast } from '../ui/Toast';

interface ChartContainerProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}

export function ChartContainer({ title, subtitle, children }: ChartContainerProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().then(() => {
        setIsFullscreen(true);
      }).catch(err => {
        console.error("Fullscreen error:", err);
      });
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  // Monitor fullscreen change events (e.g. if user presses Escape key)
  React.useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  const handleDownloadImage = () => {
    try {
      if (!containerRef.current) return;
      
      const svgElement = containerRef.current.querySelector('svg');
      if (!svgElement) {
        toast.error("Could not find chart element to export");
        return;
      }

      const svgString = new XMLSerializer().serializeToString(svgElement);
      const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
      const DOMURL = window.URL || window.webkitURL || window;
      const blobURL = DOMURL.createObjectURL(svgBlob);
      
      const image = new Image();
      image.onload = () => {
        const canvas = document.createElement('canvas');
        // Add a bit of padding/margin to canvas
        const width = svgElement.getBoundingClientRect().width || 600;
        const height = svgElement.getBoundingClientRect().height || 400;
        
        canvas.width = width * 2; // high resolution retina export
        canvas.height = height * 2;
        
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.scale(2, 2);
          // Set solid white background if in light mode, dark if dark mode
          const isDark = document.body.classList.contains('dark');
          ctx.fillStyle = isDark ? '#0F172A' : '#FFFFFF';
          ctx.fillRect(0, 0, width, height);
          
          ctx.drawImage(image, 0, 0, width, height);
          
          const pngURL = canvas.toDataURL('image/png');
          const downloadLink = document.createElement('a');
          downloadLink.href = pngURL;
          downloadLink.download = `${title.toLowerCase().replace(/\s+/g, '_')}_chart.png`;
          document.body.appendChild(downloadLink);
          downloadLink.click();
          document.body.removeChild(downloadLink);
        }
        DOMURL.revokeObjectURL(blobURL);
      };
      
      image.src = blobURL;
      toast.success("Downloading chart image...");
    } catch (err) {
      console.error(err);
      toast.error("Failed to export chart image offline");
    }
  };

  return (
    <div 
      ref={containerRef}
      className={`bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-800 p-5 rounded-dashboard shadow-dashboard flex flex-col transition-all relative ${
        isFullscreen ? 'w-full h-full p-8 z-[999] border-none' : 'h-[360px]'
      }`}
    >
      {/* Header controls */}
      <div className="flex justify-between items-start mb-4">
        <div>
          <h4 className="text-[14px] font-bold text-slate-800 dark:text-white">
            {title}
          </h4>
          {subtitle && (
            <p className="text-[11px] text-slate-450 dark:text-slate-500 mt-0.5">
              {subtitle}
            </p>
          )}
        </div>
        <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800/40 p-1 rounded-xl">
          <button
            onClick={handleDownloadImage}
            className="p-1.5 rounded-lg text-slate-450 hover:text-slate-700 dark:hover:text-slate-205 hover:bg-white dark:hover:bg-slate-800 transition-all"
            title="Download Chart as PNG"
          >
            <Download className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={toggleFullscreen}
            className="p-1.5 rounded-lg text-slate-450 hover:text-slate-700 dark:hover:text-slate-205 hover:bg-white dark:hover:bg-slate-800 transition-all"
            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen Mode"}
          >
            {isFullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>

      {/* Chart body */}
      <div className="flex-1 min-h-0 w-full relative">
        {children}
      </div>
    </div>
  );
}
