// Inner client component: actually pulls in react-pdf + pdfjs-dist.
// Loaded via next/dynamic({ ssr: false }) from ./pdf-viewer.tsx so this file's
// module scope only executes in the browser — safe to reference document/window
// transitively.
"use client";

import { Document, Page, pdfjs } from "react-pdf";
import { useEffect, useState } from "react";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

// pdf.js worker: unpkg is fine in dev/prod as long as users have internet. For
// fully offline production, copy `node_modules/pdfjs-dist/build/pdf.worker.min.mjs`
// into `public/` and switch this to `"/pdf.worker.min.mjs"`.
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

type Props = { file: string };

export function PdfViewerInner({ file }: Props) {
  const [numPages, setNumPages] = useState(0);
  const [pageNum, setPageNum] = useState(1);
  const [width, setWidth] = useState(800);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onResize = () => setWidth(Math.min(800, window.innerWidth - 40));
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  if (error) {
    return (
      <div className="my-6 rounded-2xl border border-separator bg-surface p-8 text-center">
        <p className="text-muted-foreground">Unable to load PDF viewer.</p>
        <a
          href={file}
          className="focus-ring mt-3 inline-block rounded-lg text-accent hover:underline"
          download
        >
          Download PDF instead
        </a>
      </div>
    );
  }

  return (
    <div className="my-6">
      <div className="flex min-h-[60vh] flex-col items-center rounded-2xl border border-separator bg-surface p-4">
        <Document
          file={file}
          onLoadSuccess={(pdf) => setNumPages(pdf.numPages)}
          onLoadError={(err) => setError(err.message)}
          loading={<p className="py-16 text-muted-foreground">Loading PDF…</p>}
          error={<p className="py-16 text-muted-foreground">Failed to load PDF.</p>}
        >
          <Page
            pageNumber={pageNum}
            width={width}
            renderTextLayer={false}
            renderAnnotationLayer={false}
          />
        </Document>
        {numPages > 0 && (
          <div className="mt-4 flex items-center gap-3">
            <button
              type="button"
              onClick={() => setPageNum((p) => Math.max(1, p - 1))}
              disabled={pageNum <= 1}
              className="focus-ring rounded-lg border border-separator bg-background px-3 py-1 text-sm hover:bg-muted disabled:opacity-50"
            >
              ← Prev
            </button>
            <span className="text-sm text-muted-foreground">
              Page {pageNum} of {numPages}
            </span>
            <button
              type="button"
              onClick={() => setPageNum((p) => Math.min(numPages, p + 1))}
              disabled={pageNum >= numPages}
              className="focus-ring rounded-lg border border-separator bg-background px-3 py-1 text-sm hover:bg-muted disabled:opacity-50"
            >
              Next →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
