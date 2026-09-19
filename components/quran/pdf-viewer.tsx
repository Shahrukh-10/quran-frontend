// Client component wrapper around react-pdf.
// react-pdf transitively imports pdfjs-dist/web/pdf_viewer.mjs which touches
// `document` at module top level — that breaks SSR even for a "use client"
// component (Next still evaluates it during server render). We isolate the
// react-pdf import in an inner client component and load it with
// next/dynamic({ ssr: false }) so it only ever executes in the browser.
"use client";

import dynamic from "next/dynamic";

const PdfViewerInner = dynamic(
  () => import("./pdf-viewer-inner").then((m) => m.PdfViewerInner),
  {
    ssr: false,
    loading: () => (
      <div className="my-6 flex min-h-[60vh] items-center justify-center rounded-2xl border border-separator bg-surface p-4">
        <p className="text-muted-foreground">Loading PDF viewer…</p>
      </div>
    ),
  },
);

type Props = { file: string };

export function PdfViewer({ file }: Props) {
  return <PdfViewerInner file={file} />;
}
