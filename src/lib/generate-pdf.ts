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

const BLUE = "#1a56db";
const DARK = "#1f2937";
const GRAY = "#6b7280";
const LIGHT_BG = "#f3f4f6";
const WHITE = "#ffffff";
const GREEN = "#16a34a";
const RED = "#dc2626";
const LEFT = 40;
const RIGHT = 555;
const WIDTH = RIGHT - LEFT;
const FOOTER_Y = 800;

type Doc = InstanceType<typeof PDFDocument>;

async function fetchImageBuffer(url: string): Promise<Buffer | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return Buffer.from(await res.arrayBuffer());
  } catch {
    return null;
  }
}

function ensureSpace(doc: Doc, needed: number) {
  if (doc.y + needed > FOOTER_Y - 20) {
    doc.addPage();
    doc.y = LEFT;
  }
}

function drawSectionTitle(doc: Doc, title: string) {
  ensureSpace(doc, 30);
  doc.y += 14;
  doc
    .fontSize(11)
    .font("Helvetica-Bold")
    .fillColor(BLUE)
    .text(title, LEFT, doc.y);
  const lineY = doc.y + 3;
  doc
    .moveTo(LEFT, lineY)
    .lineTo(RIGHT, lineY)
    .strokeColor(BLUE)
    .lineWidth(1)
    .stroke();
  doc.y = lineY + 8;
}

function drawCheckbox(doc: Doc, x: number, y: number, checked: boolean) {
  const s = 8;
  if (checked) {
    doc.rect(x, y, s, s).fillAndStroke(GREEN, GREEN);
    doc
      .save()
      .strokeColor(WHITE)
      .lineWidth(1.4)
      .moveTo(x + 1.8, y + s * 0.5)
      .lineTo(x + s * 0.38, y + s - 2)
      .lineTo(x + s - 1.8, y + 1.8)
      .stroke()
      .restore();
  } else {
    doc.rect(x, y, s, s).fillAndStroke("#fef2f2", RED);
    doc
      .save()
      .strokeColor(RED)
      .lineWidth(1)
      .moveTo(x + 2, y + 2)
      .lineTo(x + s - 2, y + s - 2)
      .moveTo(x + s - 2, y + 2)
      .lineTo(x + 2, y + s - 2)
      .stroke()
      .restore();
  }
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
    margin: LEFT,
    bufferPages: true,
  });
  const chunks: Buffer[] = [];
  doc.on("data", (chunk: Buffer) => chunks.push(chunk));
  const pdfReady = new Promise<Buffer>((resolve) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
  });

  // ── HEADER ──────────────────────────────────────────────
  doc
    .rect(0, 0, 595.28, 80)
    .fill(BLUE);

  doc
    .fontSize(22)
    .font("Helvetica-Bold")
    .fillColor(WHITE)
    .text("12LR Check Sheet", LEFT, 22);
  doc
    .fontSize(9)
    .font("Helvetica")
    .fillColor("#bfdbfe")
    .text("Vehicle Handover Report", LEFT, 48);

  const statusText = handover.status.toUpperCase();
  const statusColor = handover.status === "completed" ? "#bbf7d0" : "#fde68a";
  const statusWidth = doc.widthOfString(statusText) + 16;
  doc
    .roundedRect(RIGHT - statusWidth, 26, statusWidth, 22, 4)
    .fill(statusColor);
  doc
    .fontSize(9)
    .font("Helvetica-Bold")
    .fillColor(DARK)
    .text(statusText, RIGHT - statusWidth + 8, 32);

  doc.y = 95;

  // ── VEHICLE DETAILS ─────────────────────────────────────
  const detailBoxH = 58;
  doc
    .roundedRect(LEFT, doc.y, WIDTH, detailBoxH, 4)
    .fillAndStroke(LIGHT_BG, "#d1d5db");

  const fields: [string, string][] = [
    ["Date", new Date(handover.date).toLocaleDateString("en-GB")],
    ["Inspector", handover.name],
    ["Mileage", handover.mileage?.toLocaleString() || "N/A"],
    ["Vehicle", `${vehicle.make} ${vehicle.model}`],
    ["Registration", vehicle.registration],
  ];

  const colW = WIDTH / 3;
  const row1Y = doc.y + 8;
  const row2Y = row1Y + 26;

  fields.forEach(([label, value], i) => {
    const row = i < 3 ? row1Y : row2Y;
    const col = i < 3 ? i : i - 3;
    const x = LEFT + 10 + col * colW;
    doc.fontSize(6.5).font("Helvetica").fillColor(GRAY).text(label.toUpperCase(), x, row);
    doc.fontSize(9.5).font("Helvetica-Bold").fillColor(DARK).text(value || "N/A", x, row + 9);
  });

  doc.y += detailBoxH + 6;

  // ── VEHICLE CHECKS ──────────────────────────────────────
  drawSectionTitle(doc, "Vehicle Checks");

  // Table header
  const thY = doc.y;
  doc.rect(LEFT, thY - 2, WIDTH, 14).fill(DARK);
  doc
    .fontSize(6.5)
    .font("Helvetica-Bold")
    .fillColor(WHITE)
    .text("", LEFT + 6, thY + 1, { width: 14 })
    .text("CHECK ITEM", LEFT + 22, thY + 1, { width: 280 })
    .text("COMMENTS", LEFT + 310, thY + 1, { width: WIDTH - 316, align: "right" });
  doc.y = thY + 16;

  checks.forEach((check, i) => {
    const label =
      CHECK_ITEM_LABELS[check.checkItem as CheckItemKey] || check.checkItem;

    doc.fontSize(8);
    const labelH = doc.heightOfString(label, { width: 275 });
    doc.fontSize(7);
    const commentH = check.comments
      ? doc.heightOfString(check.comments, { width: WIDTH - 320 })
      : 0;
    const rowH = Math.max(labelH, commentH, 12) + 6;

    ensureSpace(doc, rowH);

    const rowY = doc.y;

    // Alternating row background
    if (i % 2 === 0) {
      doc.rect(LEFT, rowY - 1, WIDTH, rowH).fill("#f9fafb");
    }

    drawCheckbox(doc, LEFT + 6, rowY + 1, check.checked);

    doc
      .fontSize(8)
      .font("Helvetica")
      .fillColor(DARK)
      .text(label, LEFT + 22, rowY + 1, { width: 275 });

    if (check.comments) {
      doc
        .fontSize(7)
        .fillColor(GRAY)
        .text(check.comments, LEFT + 310, rowY + 1, {
          width: WIDTH - 316,
          align: "right",
        });
    }

    doc.y = rowY + rowH;

    // Row separator
    doc
      .moveTo(LEFT, doc.y)
      .lineTo(RIGHT, doc.y)
      .strokeColor("#e5e7eb")
      .lineWidth(0.3)
      .stroke();
  });

  // ── TYRE INFORMATION ────────────────────────────────────
  drawSectionTitle(doc, "Tyre Information");

  const tyreCols = [
    { label: "POSITION", x: LEFT + 6, w: 80 },
    { label: "SIZE", x: LEFT + 90, w: 150 },
    { label: "DEPTH", x: LEFT + 250, w: 120 },
    { label: "BRAND", x: LEFT + 380, w: WIDTH - 386 },
  ];

  // Tyre table header
  const tthY = doc.y;
  doc.rect(LEFT, tthY - 2, WIDTH, 14).fill(DARK);
  doc.fontSize(6.5).font("Helvetica-Bold").fillColor(WHITE);
  tyreCols.forEach((c) => doc.text(c.label, c.x, tthY + 1, { width: c.w }));
  doc.y = tthY + 16;

  tyres.forEach((tyre, i) => {
    ensureSpace(doc, 18);
    const rowY = doc.y;

    if (i % 2 === 0) {
      doc.rect(LEFT, rowY - 1, WIDTH, 16).fill("#f9fafb");
    }

    doc.fontSize(8).font("Helvetica-Bold").fillColor(DARK);
    doc.text(tyre.position, tyreCols[0].x, rowY + 1, { width: tyreCols[0].w });
    doc.font("Helvetica").fillColor(DARK);
    doc.text(tyre.size || "-", tyreCols[1].x, rowY + 1, { width: tyreCols[1].w });
    doc.text(tyre.depth || "-", tyreCols[2].x, rowY + 1, { width: tyreCols[2].w });
    doc.text(tyre.brand || "-", tyreCols[3].x, rowY + 1, { width: tyreCols[3].w });

    doc.y = rowY + 16;
    doc
      .moveTo(LEFT, doc.y)
      .lineTo(RIGHT, doc.y)
      .strokeColor("#e5e7eb")
      .lineWidth(0.3)
      .stroke();
  });

  // ── OTHER COMMENTS ──────────────────────────────────────
  if (handover.otherComments) {
    drawSectionTitle(doc, "Other Comments");

    const boxPad = 10;
    const textW = WIDTH - boxPad * 2;
    doc.fontSize(9);
    const textH = doc.heightOfString(handover.otherComments, {
      width: textW,
    });
    const boxH = textH + boxPad * 2;

    ensureSpace(doc, boxH + 4);

    doc
      .roundedRect(LEFT, doc.y, WIDTH, boxH, 3)
      .fillAndStroke(LIGHT_BG, "#d1d5db");
    doc
      .fontSize(9)
      .font("Helvetica")
      .fillColor(DARK)
      .text(handover.otherComments, LEFT + boxPad, doc.y - boxH + boxPad, {
        width: textW,
        lineGap: 3,
      });
    doc.y += 4;
  }

  // ── PHOTOS ──────────────────────────────────────────────
  if (photos.length > 0) {
    doc.addPage();

    // Photo page header bar
    doc.rect(0, 0, 595.28, 44).fill(BLUE);
    doc
      .fontSize(14)
      .font("Helvetica-Bold")
      .fillColor(WHITE)
      .text("Photos", LEFT, 14);
    doc.y = 56;

    const grouped: Record<string, typeof photos> = {};
    for (const photo of photos) {
      const cat = photo.category || "other";
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(photo);
    }

    const imgW = 248;
    const imgH = 186;
    const gap = 18;

    for (const [category, catPhotos] of Object.entries(grouped)) {
      ensureSpace(doc, 30);

      // Category label
      doc
        .fontSize(10)
        .font("Helvetica-Bold")
        .fillColor(DARK)
        .text(
          category.charAt(0).toUpperCase() + category.slice(1),
          LEFT,
          doc.y
        );
      doc.y += 6;

      let col = 0;
      const rowStartY = doc.y;

      for (const photo of catPhotos) {
        if (col === 0 && doc.y + imgH + 24 > FOOTER_Y - 20) {
          doc.addPage();
          doc.y = LEFT;
          col = 0;
        }

        const x = LEFT + col * (imgW + gap);
        const imgBuffer = await fetchImageBuffer(photo.blobUrl);

        // Draw light background placeholder
        doc
          .roundedRect(x, doc.y, imgW, imgH, 3)
          .fillAndStroke(LIGHT_BG, "#d1d5db");

        if (imgBuffer) {
          try {
            doc.image(imgBuffer, x + 1, doc.y + 1, {
              fit: [imgW - 2, imgH - 2],
              align: "center",
              valign: "center",
            });
          } catch {
            doc
              .fontSize(8)
              .fillColor(GRAY)
              .text("[Could not render]", x + 10, doc.y + imgH / 2);
          }
        }

        // Caption below image
        if (photo.caption) {
          doc
            .fontSize(7)
            .font("Helvetica")
            .fillColor(GRAY)
            .text(photo.caption, x, doc.y + imgH + 3, { width: imgW });
        }

        col++;
        if (col >= 2) {
          col = 0;
          doc.y += imgH + (photo.caption ? 20 : 14);
        }
      }

      if (col !== 0) {
        doc.y = rowStartY + imgH + 20;
      }
      doc.y += 6;
    }
  }

  // ── FOOTER ON EVERY PAGE ────────────────────────────────
  const pageCount = doc.bufferedPageRange();
  for (let i = 0; i < pageCount.count; i++) {
    doc.switchToPage(i);

    // Thin line above footer
    doc
      .moveTo(LEFT, FOOTER_Y - 6)
      .lineTo(RIGHT, FOOTER_Y - 6)
      .strokeColor("#d1d5db")
      .lineWidth(0.5)
      .stroke();

    doc
      .fontSize(7)
      .font("Helvetica")
      .fillColor("#9ca3af")
      .text(
        `Page ${i + 1} of ${pageCount.count}`,
        LEFT,
        FOOTER_Y,
        { width: WIDTH / 3 }
      )
      .text(
        `${vehicle.make} ${vehicle.model} - ${vehicle.registration}`,
        LEFT + WIDTH / 3,
        FOOTER_Y,
        { width: WIDTH / 3, align: "center" }
      )
      .text(
        `Generated ${new Date().toLocaleDateString("en-GB")}`,
        LEFT + (WIDTH / 3) * 2,
        FOOTER_Y,
        { width: WIDTH / 3, align: "right" }
      );
  }

  doc.end();

  const buffer = await pdfReady;
  return {
    buffer,
    filename: `${vehicle.registration}-handover.pdf`,
  };
}
