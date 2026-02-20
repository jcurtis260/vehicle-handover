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

const BLACK = "#000000";
const DARK = "#1a1a1a";
const GRAY = "#666666";
const LIGHT_GRAY = "#999999";
const BORDER = "#d4d4d4";
const LIGHT_BG = "#f5f5f5";
const WHITE = "#ffffff";
const GREEN = "#16a34a";
const RED = "#dc2626";
const LEFT = 40;
const RIGHT = 555;
const WIDTH = RIGHT - LEFT;
const BOTTOM = 780;

const COMPANY_NAME = "12 LONDON RD";
const COMPANY_ADDRESS = "Hamilton Court, Carthouse Lane, Horsell, GU21 4XS";
const COMPANY_PHONE = "Tel: 01276 473359";

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
  if (doc.y + needed > BOTTOM) {
    doc.addPage();
    doc.y = LEFT;
  }
}

function drawLogo(doc: Doc, x: number, y: number, color: string, scale = 1) {
  doc.save();
  doc.fillColor(color);
  const s12 = 11 * scale;
  const sLondon = 18 * scale;
  const sRd = 10 * scale;

  doc.fontSize(s12).font("Helvetica");
  const w12 = doc.widthOfString("12");
  doc.text("12", x, y + (sLondon - s12) * 0.55, { lineBreak: false });

  const xL = x + w12 + 5 * scale;
  doc.fontSize(sLondon).font("Helvetica-Bold");
  const wL = doc.widthOfString("LONDON");
  doc.text("LONDON", xL, y, { lineBreak: false });

  const xR = xL + wL + 4 * scale;
  doc.fontSize(sRd).font("Helvetica");
  doc.text("RD", xR, y + (sLondon - sRd) * 0.45, { lineBreak: false });

  doc.restore();
}

function drawHeader(doc: Doc) {
  const headerH = 64;
  doc.rect(0, 0, 595.28, headerH).fill(BLACK);

  drawLogo(doc, LEFT, 20, WHITE);

  doc.fontSize(7.5).font("Helvetica").fillColor("#cccccc");
  doc.text(COMPANY_ADDRESS, LEFT, 22, {
    width: WIDTH,
    align: "right",
    lineBreak: false,
  });
  doc.text(COMPANY_PHONE, LEFT, 34, {
    width: WIDTH,
    align: "right",
    lineBreak: false,
  });

  doc.y = headerH + 10;
}

function drawPhotoPageHeader(doc: Doc) {
  const headerH = 48;
  doc.rect(0, 0, 595.28, headerH).fill(BLACK);
  drawLogo(doc, LEFT, 14, WHITE, 0.85);

  doc.fontSize(7).font("Helvetica").fillColor("#cccccc");
  doc.text(`${COMPANY_ADDRESS}  |  ${COMPANY_PHONE}`, LEFT, 20, {
    width: WIDTH,
    align: "right",
    lineBreak: false,
  });

  doc.y = headerH + 10;
}

function drawSectionTitle(doc: Doc, title: string) {
  ensureSpace(doc, 26);
  doc.y += 8;
  doc
    .fontSize(11)
    .font("Helvetica-Bold")
    .fillColor(BLACK)
    .text(title, LEFT, doc.y, { lineBreak: false });
  const lineY = doc.y + 14;
  doc
    .moveTo(LEFT, lineY)
    .lineTo(RIGHT, lineY)
    .strokeColor(BLACK)
    .lineWidth(0.8)
    .stroke();
  doc.y = lineY + 6;
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

function writeFooter(
  doc: Doc,
  pageIndex: number,
  totalPages: number,
  vehicleLabel: string,
  genDate: string
) {
  doc.switchToPage(pageIndex);

  doc
    .moveTo(LEFT, BOTTOM + 4)
    .lineTo(RIGHT, BOTTOM + 4)
    .strokeColor(BORDER)
    .lineWidth(0.5)
    .stroke();

  const footerY = BOTTOM + 10;
  doc.fontSize(7).font("Helvetica").fillColor(LIGHT_GRAY);

  doc.save();
  doc.text(`Page ${pageIndex + 1} of ${totalPages}`, LEFT, footerY, {
    width: WIDTH / 3,
    lineBreak: false,
    height: 10,
  });
  doc.restore();

  doc.save();
  doc.text(vehicleLabel, LEFT + WIDTH / 3, footerY, {
    width: WIDTH / 3,
    align: "center",
    lineBreak: false,
    height: 10,
  });
  doc.restore();

  doc.save();
  doc.text(`Generated ${genDate}`, LEFT + (WIDTH / 3) * 2, footerY, {
    width: WIDTH / 3,
    align: "right",
    lineBreak: false,
    height: 10,
  });
  doc.restore();
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
    margins: { top: LEFT, bottom: 50, left: LEFT, right: LEFT },
    bufferPages: true,
  });
  const chunks: Buffer[] = [];
  doc.on("data", (chunk: Buffer) => chunks.push(chunk));
  const pdfReady = new Promise<Buffer>((resolve) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
  });

  // ── HEADER ──────────────────────────────────────────────
  drawHeader(doc);

  // ── STATUS + REPORT TITLE ─────────────────────────────
  const statusText = handover.status.toUpperCase();
  const statusColor = handover.status === "completed" ? GREEN : "#d97706";
  const statusBg = handover.status === "completed" ? "#dcfce7" : "#fef3c7";

  doc.fontSize(15).font("Helvetica-Bold").fillColor(BLACK)
    .text("Vehicle Handover Report", LEFT, doc.y, { lineBreak: false });

  doc.fontSize(8).font("Helvetica-Bold");
  const statusW = doc.widthOfString(statusText) + 14;
  doc.roundedRect(RIGHT - statusW, doc.y - 2, statusW, 18, 3).fill(statusBg);
  doc.fillColor(statusColor)
    .text(statusText, RIGHT - statusW + 7, doc.y + 3, { lineBreak: false });

  doc.y += 22;

  // ── VEHICLE DETAILS ─────────────────────────────────────
  const detailBoxH = 52;
  const detailBoxY = doc.y;
  doc
    .roundedRect(LEFT, detailBoxY, WIDTH, detailBoxH, 4)
    .fillAndStroke(LIGHT_BG, BORDER);

  const fields: [string, string][] = [
    ["Date", new Date(handover.date).toLocaleDateString("en-GB")],
    ["Inspector", handover.name],
    ["Mileage", handover.mileage?.toLocaleString() || "N/A"],
    ["Vehicle", `${vehicle.make} ${vehicle.model}`],
    ["Registration", vehicle.registration],
  ];

  const colW = WIDTH / 3;
  const row1Y = detailBoxY + 6;
  const row2Y = row1Y + 24;

  fields.forEach(([label, value], i) => {
    const row = i < 3 ? row1Y : row2Y;
    const col = i < 3 ? i : i - 3;
    const x = LEFT + 10 + col * colW;
    doc.fontSize(6.5).font("Helvetica").fillColor(GRAY)
      .text(label.toUpperCase(), x, row, { lineBreak: false });
    doc.fontSize(9.5).font("Helvetica-Bold").fillColor(DARK)
      .text(value || "N/A", x, row + 9, { lineBreak: false });
  });

  doc.y = detailBoxY + detailBoxH + 2;

  // ── VEHICLE CHECKS ──────────────────────────────────────
  drawSectionTitle(doc, "Vehicle Checks");

  const thY = doc.y;
  doc.rect(LEFT, thY - 2, WIDTH, 14).fill(BLACK);
  doc.fontSize(6.5).font("Helvetica-Bold").fillColor(WHITE);
  doc.text("CHECK ITEM", LEFT + 22, thY + 1, { width: 280, lineBreak: false });
  doc.text("COMMENTS", LEFT + 310, thY + 1, {
    width: WIDTH - 316,
    align: "right",
    lineBreak: false,
  });
  doc.y = thY + 15;

  checks.forEach((check, i) => {
    const label =
      CHECK_ITEM_LABELS[check.checkItem as CheckItemKey] || check.checkItem;

    doc.fontSize(8).font("Helvetica");
    const labelH = doc.heightOfString(label, { width: 275 });
    doc.fontSize(7);
    const commentH = check.comments
      ? doc.heightOfString(check.comments, { width: WIDTH - 320 })
      : 0;
    const rowH = Math.max(labelH, commentH, 11) + 4;

    ensureSpace(doc, rowH + 1);

    const rowY = doc.y;

    if (i % 2 === 0) {
      doc.rect(LEFT, rowY - 1, WIDTH, rowH).fill(LIGHT_BG);
    }

    drawCheckbox(doc, LEFT + 6, rowY, check.checked);

    doc
      .fontSize(8)
      .font("Helvetica")
      .fillColor(DARK)
      .text(label, LEFT + 22, rowY, { width: 275 });

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
    { label: "POSITION", x: LEFT + 6, w: 65 },
    { label: "SIZE", x: LEFT + 75, w: 120 },
    { label: "DEPTH", x: LEFT + 200, w: 80 },
    { label: "BRAND", x: LEFT + 285, w: 120 },
    { label: "TYPE", x: LEFT + 410, w: WIDTH - 416 },
  ];

  const tthY = doc.y;
  doc.rect(LEFT, tthY - 2, WIDTH, 14).fill(BLACK);
  doc.fontSize(6.5).font("Helvetica-Bold").fillColor(WHITE);
  tyreCols.forEach((c) =>
    doc.text(c.label, c.x, tthY + 1, { width: c.w, lineBreak: false })
  );
  doc.y = tthY + 15;

  tyres.forEach((tyre, i) => {
    ensureSpace(doc, 16);
    const rowY = doc.y;

    if (i % 2 === 0) {
      doc.rect(LEFT, rowY - 1, WIDTH, 15).fill(LIGHT_BG);
    }

    doc.fontSize(8).font("Helvetica-Bold").fillColor(DARK);
    doc.text(tyre.position, tyreCols[0].x, rowY + 1, {
      width: tyreCols[0].w,
      lineBreak: false,
    });
    doc.font("Helvetica").fillColor(DARK);
    doc.text(tyre.size || "-", tyreCols[1].x, rowY + 1, {
      width: tyreCols[1].w,
      lineBreak: false,
    });
    doc.text(tyre.depth || "-", tyreCols[2].x, rowY + 1, {
      width: tyreCols[2].w,
      lineBreak: false,
    });
    doc.text(tyre.brand || "-", tyreCols[3].x, rowY + 1, {
      width: tyreCols[3].w,
      lineBreak: false,
    });
    doc.text(
      tyre.tyreType === "run_flat" ? "Run Flat" : "Normal",
      tyreCols[4].x,
      rowY + 1,
      { width: tyreCols[4].w, lineBreak: false }
    );

    doc.y = rowY + 15;
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

    const pad = 10;
    const textW = WIDTH - pad * 2;
    doc.fontSize(9).font("Helvetica");
    const textH = doc.heightOfString(handover.otherComments, { width: textW });
    const boxH = textH + pad * 2;

    ensureSpace(doc, boxH + 4);

    const boxY = doc.y;
    doc
      .roundedRect(LEFT, boxY, WIDTH, boxH, 3)
      .fillAndStroke(LIGHT_BG, BORDER);

    doc
      .fontSize(9)
      .font("Helvetica")
      .fillColor(DARK)
      .text(handover.otherComments, LEFT + pad, boxY + pad, {
        width: textW,
        lineGap: 3,
      });

    doc.y = boxY + boxH + 4;
  }

  // ── PHOTOS ──────────────────────────────────────────────
  if (photos.length > 0) {
    doc.addPage();
    drawPhotoPageHeader(doc);

    doc.fontSize(13).font("Helvetica-Bold").fillColor(BLACK)
      .text("Photos", LEFT, doc.y, { lineBreak: false });
    doc.y += 20;

    const grouped: Record<string, typeof photos> = {};
    for (const photo of photos) {
      const cat = photo.category || "other";
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(photo);
    }

    const imgW = 245;
    const imgH = 184;
    const colGap = 25;
    const rowGap = 8;
    const captionSpace = 14;

    for (const [category, catPhotos] of Object.entries(grouped)) {
      ensureSpace(doc, 30);

      doc
        .fontSize(10)
        .font("Helvetica-Bold")
        .fillColor(BLACK)
        .text(
          category.charAt(0).toUpperCase() + category.slice(1),
          LEFT,
          doc.y,
          { lineBreak: false }
        );
      doc.y += 14;

      let col = 0;
      let rowStartY = doc.y;

      for (const photo of catPhotos) {
        const totalSlotH = imgH + captionSpace + rowGap;

        if (col === 0 && rowStartY + totalSlotH > BOTTOM) {
          doc.addPage();
          doc.y = LEFT;
          rowStartY = doc.y;
        }

        const x = col === 0 ? LEFT : LEFT + imgW + colGap;
        const imgBuffer = await fetchImageBuffer(photo.blobUrl);

        doc.save();
        doc
          .roundedRect(x, rowStartY, imgW, imgH, 3)
          .fillAndStroke(LIGHT_BG, BORDER);
        doc.restore();

        if (imgBuffer) {
          try {
            doc.image(imgBuffer, x + 2, rowStartY + 2, {
              fit: [imgW - 4, imgH - 4],
              align: "center",
              valign: "center",
            });
          } catch {
            doc.save();
            doc
              .fontSize(8)
              .fillColor(LIGHT_GRAY)
              .text("[Image unavailable]", x + 10, rowStartY + imgH / 2, {
                lineBreak: false,
              });
            doc.restore();
          }
        }

        if (photo.caption) {
          doc.save();
          doc
            .fontSize(7)
            .font("Helvetica")
            .fillColor(GRAY)
            .text(photo.caption, x, rowStartY + imgH + 3, {
              width: imgW,
              lineBreak: false,
            });
          doc.restore();
        }

        col++;
        if (col >= 2) {
          col = 0;
          rowStartY = rowStartY + totalSlotH;
          doc.y = rowStartY;
        }
      }

      if (col !== 0) {
        doc.y = rowStartY + imgH + captionSpace + rowGap;
      }
      doc.y += 4;
    }
  }

  // ── FOOTER ON EVERY PAGE ────────────────────────────────
  const totalPages = doc.bufferedPageRange().count;
  const genDate = new Date().toLocaleDateString("en-GB");
  const vehicleLabel = `${vehicle.make} ${vehicle.model} - ${vehicle.registration}`;

  for (let i = 0; i < totalPages; i++) {
    writeFooter(doc, i, totalPages, vehicleLabel, genDate);
  }

  doc.end();

  const buffer = await pdfReady;
  return {
    buffer,
    filename: `${vehicle.registration}-handover.pdf`,
  };
}
