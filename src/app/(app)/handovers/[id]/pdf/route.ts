import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { handovers, vehicles, handoverChecks, tyreRecords, handoverPhotos } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { CHECK_ITEM_LABELS, type CheckItemKey } from "@/lib/check-items";
import ReactPDF from "@react-pdf/renderer";
import { Document, Page, Text, View, StyleSheet, Image } from "@react-pdf/renderer";
import React from "react";

const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontSize: 9,
    fontFamily: "Helvetica",
  },
  header: {
    marginBottom: 15,
    borderBottom: "2 solid #1d4ed8",
    paddingBottom: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1d4ed8",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 10,
    color: "#666",
  },
  detailsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 15,
    gap: 0,
  },
  detailItem: {
    width: "33%",
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 7,
    color: "#666",
    textTransform: "uppercase",
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 10,
    fontWeight: "bold",
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "bold",
    marginBottom: 8,
    marginTop: 12,
    color: "#1d4ed8",
    borderBottom: "1 solid #ddd",
    paddingBottom: 4,
  },
  checkRow: {
    flexDirection: "row",
    borderBottom: "0.5 solid #eee",
    paddingVertical: 3,
    alignItems: "center",
  },
  checkStatus: {
    width: 18,
    fontSize: 10,
    textAlign: "center",
  },
  checkLabel: {
    flex: 1,
    fontSize: 8,
    paddingLeft: 4,
  },
  checkComment: {
    width: 150,
    fontSize: 7,
    color: "#666",
    textAlign: "right",
  },
  tableHeader: {
    flexDirection: "row",
    borderBottom: "1 solid #333",
    paddingBottom: 3,
    marginBottom: 3,
  },
  tableHeaderCell: {
    fontWeight: "bold",
    fontSize: 8,
  },
  tableRow: {
    flexDirection: "row",
    borderBottom: "0.5 solid #eee",
    paddingVertical: 3,
  },
  tableCell: {
    fontSize: 8,
  },
  comments: {
    marginTop: 12,
    padding: 8,
    backgroundColor: "#f9f9f9",
    borderRadius: 4,
  },
  commentsText: {
    fontSize: 9,
    lineHeight: 1.4,
  },
  photoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 8,
  },
  photoContainer: {
    width: "48%",
    marginBottom: 8,
  },
  photo: {
    width: "100%",
    height: 150,
    objectFit: "cover",
    borderRadius: 4,
  },
  photoCaption: {
    fontSize: 7,
    color: "#666",
    marginTop: 2,
    textTransform: "capitalize",
  },
  footer: {
    position: "absolute",
    bottom: 20,
    left: 30,
    right: 30,
    fontSize: 7,
    color: "#999",
    textAlign: "center",
    borderTop: "0.5 solid #ddd",
    paddingTop: 5,
  },
});

function HandoverPDF({
  handover,
  vehicle,
  checks,
  tyres,
  photos,
}: {
  handover: typeof handovers.$inferSelect;
  vehicle: typeof vehicles.$inferSelect;
  checks: (typeof handoverChecks.$inferSelect)[];
  tyres: (typeof tyreRecords.$inferSelect)[];
  photos: (typeof handoverPhotos.$inferSelect)[];
}) {
  const checksMap = new Map(checks.map((c) => [c.checkItem, c]));
  const halfIndex = Math.ceil(checks.length / 2);
  const firstHalf = checks.slice(0, halfIndex);
  const secondHalf = checks.slice(halfIndex);

  return React.createElement(
    Document,
    null,
    // Page 1
    React.createElement(
      Page,
      { size: "A4", style: styles.page },
      React.createElement(
        View,
        { style: styles.header },
        React.createElement(Text, { style: styles.title }, "12LR Check Sheet"),
        React.createElement(
          Text,
          { style: styles.subtitle },
          "Vehicle Handover Report"
        )
      ),
      React.createElement(
        View,
        { style: styles.detailsGrid },
        ...[
          ["Date", new Date(handover.date).toLocaleDateString()],
          ["Name", handover.name],
          ["Mileage", handover.mileage?.toLocaleString() || "N/A"],
          ["Vehicle", `${vehicle.make} ${vehicle.model}`],
          ["Registration", vehicle.registration],
          ["Status", handover.status.toUpperCase()],
        ].map(([label, value]) =>
          React.createElement(
            View,
            { key: label, style: styles.detailItem },
            React.createElement(Text, { style: styles.detailLabel }, label),
            React.createElement(Text, { style: styles.detailValue }, value)
          )
        )
      ),
      React.createElement(
        Text,
        { style: styles.sectionTitle },
        "Vehicle Checks"
      ),
      React.createElement(
        View,
        { style: styles.checkRow },
        React.createElement(
          Text,
          { style: { ...styles.checkStatus, fontWeight: "bold", fontSize: 7 } },
          ""
        ),
        React.createElement(
          Text,
          { style: { ...styles.checkLabel, fontWeight: "bold", fontSize: 7 } },
          "Item"
        ),
        React.createElement(
          Text,
          { style: { ...styles.checkComment, fontWeight: "bold", fontSize: 7 } },
          "Comments"
        )
      ),
      ...firstHalf.map((check) =>
        React.createElement(
          View,
          { key: check.id, style: styles.checkRow },
          React.createElement(
            Text,
            { style: styles.checkStatus },
            check.checked ? "\u2713" : "\u2717"
          ),
          React.createElement(
            Text,
            { style: styles.checkLabel },
            CHECK_ITEM_LABELS[check.checkItem as CheckItemKey] || check.checkItem
          ),
          React.createElement(
            Text,
            { style: styles.checkComment },
            check.comments || ""
          )
        )
      ),
      React.createElement(
        Text,
        { style: styles.footer },
        `Page 1 of ${photos.length > 0 ? 3 : 2} | Generated ${new Date().toLocaleDateString()}`
      )
    ),
    // Page 2
    React.createElement(
      Page,
      { size: "A4", style: styles.page },
      React.createElement(
        Text,
        { style: styles.sectionTitle },
        "Vehicle Checks (continued)"
      ),
      ...secondHalf.map((check) =>
        React.createElement(
          View,
          { key: check.id, style: styles.checkRow },
          React.createElement(
            Text,
            { style: styles.checkStatus },
            check.checked ? "\u2713" : "\u2717"
          ),
          React.createElement(
            Text,
            { style: styles.checkLabel },
            CHECK_ITEM_LABELS[check.checkItem as CheckItemKey] || check.checkItem
          ),
          React.createElement(
            Text,
            { style: styles.checkComment },
            check.comments || ""
          )
        )
      ),
      React.createElement(Text, { style: styles.sectionTitle }, "Tyre Information"),
      React.createElement(
        View,
        { style: styles.tableHeader },
        React.createElement(
          Text,
          { style: { ...styles.tableHeaderCell, width: 60 } },
          "Position"
        ),
        React.createElement(
          Text,
          { style: { ...styles.tableHeaderCell, flex: 1 } },
          "Size"
        ),
        React.createElement(
          Text,
          { style: { ...styles.tableHeaderCell, flex: 1 } },
          "Depth"
        ),
        React.createElement(
          Text,
          { style: { ...styles.tableHeaderCell, flex: 1 } },
          "Brand"
        )
      ),
      ...tyres.map((t) =>
        React.createElement(
          View,
          { key: t.id, style: styles.tableRow },
          React.createElement(
            Text,
            { style: { ...styles.tableCell, width: 60, fontWeight: "bold" } },
            t.position
          ),
          React.createElement(
            Text,
            { style: { ...styles.tableCell, flex: 1 } },
            t.size || "-"
          ),
          React.createElement(
            Text,
            { style: { ...styles.tableCell, flex: 1 } },
            t.depth || "-"
          ),
          React.createElement(
            Text,
            { style: { ...styles.tableCell, flex: 1 } },
            t.brand || "-"
          )
        )
      ),
      handover.otherComments
        ? React.createElement(
            View,
            null,
            React.createElement(
              Text,
              { style: styles.sectionTitle },
              "Other Comments"
            ),
            React.createElement(
              View,
              { style: styles.comments },
              React.createElement(
                Text,
                { style: styles.commentsText },
                handover.otherComments
              )
            )
          )
        : null,
      React.createElement(
        Text,
        { style: styles.footer },
        `Page 2 of ${photos.length > 0 ? 3 : 2} | Generated ${new Date().toLocaleDateString()}`
      )
    ),
    // Page 3 - Photos (if any)
    ...(photos.length > 0
      ? [
          React.createElement(
            Page,
            { key: "photos", size: "A4", style: styles.page },
            React.createElement(
              Text,
              { style: styles.sectionTitle },
              "Photos"
            ),
            React.createElement(
              View,
              { style: styles.photoGrid },
              ...photos.map((photo) =>
                React.createElement(
                  View,
                  { key: photo.id, style: styles.photoContainer },
                  React.createElement(Image, {
                    style: styles.photo,
                    src: photo.blobUrl,
                  }),
                  React.createElement(
                    Text,
                    { style: styles.photoCaption },
                    `${photo.category}${photo.caption ? ` - ${photo.caption}` : ""}`
                  )
                )
              )
            ),
            React.createElement(
              Text,
              { style: styles.footer },
              `Page 3 of 3 | Generated ${new Date().toLocaleDateString()}`
            )
          ),
        ]
      : [])
  );
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const [handover] = await db
    .select()
    .from(handovers)
    .where(eq(handovers.id, id))
    .limit(1);

  if (!handover) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (handover.userId !== session.user.id && session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [vehicle] = await db
    .select()
    .from(vehicles)
    .where(eq(vehicles.id, handover.vehicleId));

  const checks = await db
    .select()
    .from(handoverChecks)
    .where(eq(handoverChecks.handoverId, id));

  const tyres = await db
    .select()
    .from(tyreRecords)
    .where(eq(tyreRecords.handoverId, id));

  const photos = await db
    .select()
    .from(handoverPhotos)
    .where(eq(handoverPhotos.handoverId, id));

  const pdfDoc = HandoverPDF({ handover, vehicle, checks, tyres, photos });
  const pdfBuffer = await ReactPDF.renderToBuffer(pdfDoc);
  const uint8 = new Uint8Array(pdfBuffer);

  return new NextResponse(uint8, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${vehicle.registration}-handover.pdf"`,
    },
  });
}
