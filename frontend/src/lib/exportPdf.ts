import { getNodesBounds, getViewportForBounds, type Node } from "@xyflow/react";
import { toPng } from "html-to-image";
import { jsPDF } from "jspdf";
import { toast } from "sonner";

interface ExportPdfOptions {
  nodes: Node[];
  title: string;
}

/**
 * Exports the active mind map canvas as a high-fidelity, printable A4 PDF document.
 * Automatically chooses optimal orientation (Landscape / Portrait) based on graph aspect ratio.
 */
export async function exportMindMapToPdf({ nodes, title }: ExportPdfOptions): Promise<void> {
  if (!nodes || nodes.length === 0) {
    toast.error("Cannot export an empty mind map.");
    return;
  }

  const viewportEl = document.querySelector(".react-flow__viewport") as HTMLElement;
  if (!viewportEl) {
    toast.error("Canvas viewport not found.");
    return;
  }

  const toastId = toast.loading("Generating PDF document...");

  try {
    const nodesBounds = getNodesBounds(nodes);

    // Add padding around mind map graph
    const padding = 100;
    const imageWidth = nodesBounds.width + padding * 2;
    const imageHeight = nodesBounds.height + padding * 2;

    const transform = getViewportForBounds(
      nodesBounds,
      imageWidth,
      imageHeight,
      0.5,
      2,
      0.1
    );

    // Determine background color based on theme / dark mode
    const isDark = document.documentElement.classList.contains("dark");
    const backgroundColor = isDark ? "#111318" : "#f8f9ff";

    // Capture canvas with 2x pixel ratio for print sharpness
    const dataUrl = await toPng(viewportEl, {
      backgroundColor,
      width: imageWidth,
      height: imageHeight,
      pixelRatio: 2,
      style: {
        width: `${imageWidth}px`,
        height: `${imageHeight}px`,
        transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.zoom})`,
      },
    });

    // Auto-determine PDF page orientation
    const isLandscape = imageWidth >= imageHeight;
    const orientation = isLandscape ? "landscape" : "portrait";

    // Standard A4 dimensions in millimeters
    const pdfWidth = isLandscape ? 297 : 210;
    const pdfHeight = isLandscape ? 210 : 297;

    const doc = new jsPDF({
      orientation,
      unit: "mm",
      format: "a4",
      compress: true,
    });

    // Background fill
    doc.setFillColor(isDark ? 17 : 248, isDark ? 19 : 249, isDark ? 24 : 255);
    doc.rect(0, 0, pdfWidth, pdfHeight, "F");

    // Margins and Header area
    const margin = 12; // 12mm
    const headerHeight = 20; // 20mm
    const printableWidth = pdfWidth - margin * 2;
    const printableHeight = pdfHeight - margin * 2 - headerHeight;

    // Header: Mind Map Title
    doc.setFont("helvetica", "bold");
    doc.setFontSize(15);
    doc.setTextColor(isDark ? 240 : 20, isDark ? 240 : 27, isDark ? 255 : 43);
    const cleanTitle = title || "Untitled Mind Map";
    doc.text(cleanTitle, margin, margin + 5);

    // Header: Subtitle / Timestamp
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(isDark ? 160 : 100, isDark ? 160 : 100, isDark ? 175 : 115);
    const dateStr = new Date().toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
    doc.text(`MindVault AI • Created ${dateStr}`, margin, margin + 11);

    // Header divider line
    doc.setDrawColor(isDark ? 60 : 220, isDark ? 60 : 225, isDark ? 80 : 240);
    doc.setLineWidth(0.3);
    doc.line(margin, margin + 14, pdfWidth - margin, margin + 14);

    // Calculate aspect ratio fit for the mind map image
    const imgAspect = imageWidth / imageHeight;
    const printableAspect = printableWidth / printableHeight;

    let renderWidth: number;
    let renderHeight: number;

    if (imgAspect > printableAspect) {
      renderWidth = printableWidth;
      renderHeight = printableWidth / imgAspect;
    } else {
      renderHeight = printableHeight;
      renderWidth = printableHeight * imgAspect;
    }

    // Center image in the printable area
    const imgX = margin + (printableWidth - renderWidth) / 2;
    const imgY = margin + headerHeight + (printableHeight - renderHeight) / 2;

    // Embed the image in PDF
    doc.addImage(dataUrl, "PNG", imgX, imgY, renderWidth, renderHeight, undefined, "FAST");

    // Footer text
    doc.setFontSize(7);
    doc.setTextColor(isDark ? 120 : 160, isDark ? 120 : 160, isDark ? 140 : 175);
    doc.text("Exported from MindVault AI — Intelligent Thought Mapping", pdfWidth / 2, pdfHeight - 5, {
      align: "center",
    });

    // Save and download
    const filename = `${cleanTitle.replace(/\s+/g, "_")}.pdf`;
    doc.save(filename);

    toast.success("PDF Document exported successfully!", { id: toastId });
  } catch (error) {
    console.error("Failed to export PDF:", error);
    toast.error("Failed to generate PDF document. Please try again.", { id: toastId });
  }
}

