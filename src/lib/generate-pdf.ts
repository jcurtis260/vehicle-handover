import { db } from "@/lib/db";
import {
  handovers,
  vehicles,
  handoverChecks,
  tyreRecords,
  handoverPhotos,
} from "@/lib/schema";
import { eq } from "drizzle-orm";
import { CHECK_ITEM_LABELS, type CheckItemKey } from "@/lib/check-items";
import PDFDocument from "pdfkit";

const BLUE = "#1d4ed8";
const GRAY = "#666666";
const LIGHT_GRAY = "#eeeeee";
const PAGE_MARGIN = 40;

async function fetchImageBuffer(url: string): Promise<Buffer | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return Buffer.from(await res.arrayBuffer());
  } catch {
    return null;
  }
}

function addHeader(doc: InstanceType<typeof PDFDocument>) {
  doc
    .fontSize(20)
    .fillColor(BLUE)
    .text("12LR Check Sheet", PAGE_MARGIN, PAGE_MARGIN);
  doc.fontSize(10).fillColor(GRAY).text("Vehicle Handover Report");
  doc
    .moveTo(PAGE_MARGIN, doc.y + 6)
    .lineTo(555, doc.y + 6)
    .strokeColor(BLUE)
    .lineWidth(2)
    .stroke();
  doc.y += 15;
}

function addDetailRow(
  doc: InstanceType<typeof PDFDocument>,
  items: [string, string][],
  y: number
) {
  const colWidth = 170;
  items.forEach(([label, value], i) => {
    const x = PAGE_MARGIN + i * colWidth;
    doc.fontSize(7).fillColor(GRAY).text(label.toUpperCase(), x, y);
    doc
      .fontSize(10)
      .fillColor("#000000")
      .font("Helvetica-Bold")
      .text(value || "N/A", x, y + 10);
    doc.font("Helvetica");
  });
}

export async function generateHandoverPdf(
  handoverId: string
): Promise<{ buffer: Buffer; filename: string }> {
  const [handover] = await db
    .select()
    .from(handovers)
    .where(eq(handovers.id, handoverId))
    .limit(1);

  if (!handover) throw new Error("Handover not found");

  const [vehicle] = await db
    .select()
    .from(vehicles)
    .where(eq(vehicles.id, handover.vehicleId));

  const checks = await db
    .select()
    .from(handoverChecks)
    .where(eq(handoverChecks.handoverId, handoverId));

  const tyres = await db
    .select()
    .from(tyreRecords)
    .where(eq(tyreRecords.handoverId, handoverId));

  const photos = await db
    .select()
    .from(handoverPhotos)
    .where(eq(handoverPhotos.handoverId, handoverId));

  const doc = new PDFDocument({
    size: "A4",
    margin: PAGE_MARGIN,
    bufferPages: true,
  });
  const chunks: Buffer[] = [];

  doc.on("data", (chunk: Buffer) => chunks.push(chunk));

  const pdfReady = new Promise<Buffer>((resolve) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
  });

  addHeader(doc);

  const detailsY = doc.y;
  addDetailRow(
    doc,
    [
      ["Date", new Date(handover.date).toLocaleDateString("en-GB")],
      ["Inspector", handover.name],
      ["Mileage", handover.mileage?.toLocaleString() || "N/A"],
    ],
    detailsY
  );
  addDetailRow(
    doc,
    [
      ["Vehicle", `${vehicle.make} ${vehicle.model}`],
      ["Registration", vehicle.registration],
      ["Status", handover.status.toUpperCase()],
    ],
    detailsY + 30
  );

  doc.y = detailsY + 70;

  // Vehicle Checks
  doc
    .fontSize(12)
    .fillColor(BLUE)
    .font("Helvetica-Bold")
    .text("Vehicle Checks", PAGE_MARGIN);
  doc
    .moveTo(PAGE_MARGIN, doc.y + 2)
    .lineTo(555, doc.y + 2)
    .strokeColor(LIGHT_GRAY)
    .lineWidth(0.5)
    .stroke();
  doc.y += 8;
  doc.font("Helvetica");

  const checkTableY = doc.y;
  doc
    .fontSize(7)
    .fillColor(GRAY)
    .font("Helvetica-Bold")
    .text("", PAGE_MARGIN, checkTableY, { width: 18 })
    .text("Check Item", PAGE_MARGIN + 22, checkTableY, { width: 300 })
    .text("Comments", 400, checkTableY, { width: 155, align: "right" });
  doc.font("Helvetica");
  doc.y = checkTableY + 14;

  for (const check of checks) {
    if (doc.y > 750) {
      doc.addPage();
      doc.y = PAGE_MARGIN;
    }

    const rowY = doc.y;
    const label =
      CHECK_ITEM_LABELS[check.checkItem as CheckItemKey] || check.checkItem;

    // Draw a checkbox with tick or cross
    const boxX = PAGE_MARGIN;
    const boxY = rowY + 1;
    const boxSize = 9;

    if (check.checked) {
      doc
        .rect(boxX, boxY, boxSize, boxSize)
        .fillAndStroke("#16a34a", "#16a34a");
      // Draw white tick inside the box
      doc
        .save()
        .strokeColor("#ffffff")
        .lineWidth(1.5)
        .moveTo(boxX + 2, boxY + boxSize / 2)
        .lineTo(boxX + boxSize * 0.38, boxY + boxSize - 2.5)
        .lineTo(boxX + boxSize - 2, boxY + 2)
        .stroke()
        .restore();
    } else {
      doc
        .rect(boxX, boxY, boxSize, boxSize)
        .fillAndStroke("#fef2f2", "#dc2626");
      // Draw red X inside the box
      doc
        .save()
        .strokeColor("#dc2626")
        .lineWidth(1.2)
        .moveTo(boxX + 2.5, boxY + 2.5)
        .lineTo(boxX + boxSize - 2.5, boxY + boxSize - 2.5)
        .moveTo(boxX + boxSize - 2.5, boxY + 2.5)
        .lineTo(boxX + 2.5, boxY + boxSize - 2.5)
        .stroke()
        .restore();
    }

    doc
      .fontSize(8)
      .fillColor("#000000")
      .text(label, PAGE_MARGIN + 16, rowY, { width: 346 });

    if (check.comments) {
      doc
        .fontSize(7)
        .fillColor(GRAY)
        .text(check.comments, 400, rowY, { width: 155, align: "right" });
    }

    const textHeight = doc.heightOfString(label, { width: 346 });
    doc.y = rowY + Math.max(textHeight, 12) + 3;

    doc
      .moveTo(PAGE_MARGIN, doc.y)
      .lineTo(555, doc.y)
      .strokeColor(LIGHT_GRAY)
      .lineWidth(0.3)
      .stroke();
    doc.y += 3;
  }

  // Tyre Information
  if (doc.y > 650) doc.addPage();

  doc.y += 8;
  doc
    .fontSize(12)
    .fillColor(BLUE)
    .font("Helvetica-Bold")
    .text("Tyre Information", PAGE_MARGIN);
  doc
    .moveTo(PAGE_MARGIN, doc.y + 2)
    .lineTo(555, doc.y + 2)
    .strokeColor(LIGHT_GRAY)
    .lineWidth(0.5)
    .stroke();
  doc.y += 8;
  doc.font("Helvetica");

  const tyreHeaderY = doc.y;
  doc
    .fontSize(8)
    .fillColor(GRAY)
    .font("Helvetica-Bold")
    .text("Position", PAGE_MARGIN, tyreHeaderY, { width: 80 })
    .text("Size", PAGE_MARGIN + 80, tyreHeaderY, { width: 160 })
    .text("Depth", PAGE_MARGIN + 240, tyreHeaderY, { width: 120 })
    .text("Brand", PAGE_MARGIN + 360, tyreHeaderY, { width: 155 });
  doc.font("Helvetica");
  doc.y = tyreHeaderY + 14;

  doc
    .moveTo(PAGE_MARGIN, doc.y)
    .lineTo(555, doc.y)
    .strokeColor("#333333")
    .lineWidth(0.5)
    .stroke();
  doc.y += 4;

  for (const tyre of tyres) {
    const rowY = doc.y;
    doc
      .fontSize(8)
      .fillColor("#000000")
      .font("Helvetica-Bold")
      .text(tyre.position, PAGE_MARGIN, rowY, { width: 80 });
    doc
      .font("Helvetica")
      .text(tyre.size || "-", PAGE_MARGIN + 80, rowY, { width: 160 })
      .text(tyre.depth || "-", PAGE_MARGIN + 240, rowY, { width: 120 })
      .text(tyre.brand || "-", PAGE_MARGIN + 360, rowY, { width: 155 });
    doc.y = rowY + 16;

    doc
      .moveTo(PAGE_MARGIN, doc.y)
      .lineTo(555, doc.y)
      .strokeColor(LIGHT_GRAY)
      .lineWidth(0.3)
      .stroke();
    doc.y += 4;
  }

  // Other Comments
  if (handover.otherComments) {
    if (doc.y > 680) doc.addPage();

    doc.y += 8;
    doc
      .fontSize(12)
      .fillColor(BLUE)
      .font("Helvetica-Bold")
      .text("Other Comments", PAGE_MARGIN);
    doc
      .moveTo(PAGE_MARGIN, doc.y + 2)
      .lineTo(555, doc.y + 2)
      .strokeColor(LIGHT_GRAY)
      .lineWidth(0.5)
      .stroke();
    doc.y += 8;
    doc.font("Helvetica");

    doc
      .fontSize(9)
      .fillColor("#000000")
      .text(handover.otherComments, PAGE_MARGIN, doc.y, {
        width: 515,
        lineGap: 3,
      });
  }

  // Photos
  if (photos.length > 0) {
    doc.addPage();

    doc
      .fontSize(12)
      .fillColor(BLUE)
      .font("Helvetica-Bold")
      .text("Photos", PAGE_MARGIN, PAGE_MARGIN);
    doc
      .moveTo(PAGE_MARGIN, doc.y + 2)
      .lineTo(555, doc.y + 2)
      .strokeColor(LIGHT_GRAY)
      .lineWidth(0.5)
      .stroke();
    doc.y += 10;
    doc.font("Helvetica");

    const grouped: Record<string, typeof photos> = {};
    for (const photo of photos) {
      const cat = photo.category || "other";
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(photo);
    }

    for (const [category, catPhotos] of Object.entries(grouped)) {
      if (doc.y > 650) doc.addPage();

      doc
        .fontSize(10)
        .fillColor("#000000")
        .font("Helvetica-Bold")
        .text(
          category.charAt(0).toUpperCase() + category.slice(1),
          PAGE_MARGIN,
          doc.y + 4
        );
      doc.y += 4;
      doc.font("Helvetica");

      let col = 0;
      const imgWidth = 245;
      const imgHeight = 180;

      for (const photo of catPhotos) {
        if (doc.y + imgHeight + 20 > 780) {
          doc.addPage();
          col = 0;
        }

        const x = PAGE_MARGIN + col * (imgWidth + 15);
        const imgBuffer = await fetchImageBuffer(photo.blobUrl);

        if (imgBuffer) {
          try {
            doc.image(imgBuffer, x, doc.y, {
              width: imgWidth,
              height: imgHeight,
              fit: [imgWidth, imgHeight],
            });
          } catch {
            doc
              .fontSize(8)
              .fillColor(GRAY)
              .text("[Photo could not be loaded]", x, doc.y + 80);
          }
        } else {
          doc
            .fontSize(8)
            .fillColor(GRAY)
            .text("[Photo could not be loaded]", x, doc.y + 80);
        }

        const captionText = `${category}${photo.caption ? ` - ${photo.caption}` : ""}`;
        doc
          .fontSize(7)
          .fillColor(GRAY)
          .text(captionText, x, doc.y + imgHeight + 2, { width: imgWidth });

        col++;
        if (col >= 2) {
          col = 0;
          doc.y += imgHeight + 20;
        }
      }

      if (col !== 0) {
        doc.y += imgHeight + 20;
      }
    }
  }

  // Footer on every page
  const pageCount = doc.bufferedPageRange();
  for (let i = 0; i < pageCount.count; i++) {
    doc.switchToPage(i);
    doc
      .fontSize(7)
      .fillColor("#999999")
      .text(
        `Page ${i + 1} of ${pageCount.count} | ${vehicle.make} ${vehicle.model} - ${vehicle.registration} | Generated ${new Date().toLocaleDateString("en-GB")}`,
        PAGE_MARGIN,
        790,
        { width: 515, align: "center" }
      );
  }

  doc.end();

  const buffer = await pdfReady;
  return {
    buffer,
    filename: `${vehicle.registration}-handover.pdf`,
  };
}
