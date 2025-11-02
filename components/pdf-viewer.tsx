"use client"

import { Viewer, Worker } from '@react-pdf-viewer/core';
import '@react-pdf-viewer/core/lib/styles/index.css';

interface PDFViewerProps {
  fileUrl: string;
}

export default function PDFViewer({ fileUrl }: PDFViewerProps) {
  return (
    // Responsive heights for all breakpoints and orientations
    // - Mobile portrait: 50vh
    // - Mobile landscape: 60vh
    // - Tablet portrait: 70vh
    // - Tablet landscape: 75vh
    // - Desktop: fixed 600px
    <div className="w-full min-h-[320px] overflow-hidden portrait:h-[50vh] landscape:h-[60vh] sm:portrait:h-[60vh] sm:landscape:h-[70vh] md:portrait:h-[70vh] md:landscape:h-[75vh] lg:h-[600px] xl:h-[700px]">
      <Worker workerUrl="/pdf.worker.min.js">
        <div className="w-full h-full">
          <Viewer fileUrl={fileUrl} />
        </div>
      </Worker>
    </div>
  );
}