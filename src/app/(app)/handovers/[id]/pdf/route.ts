import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { handovers } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { generateHandoverPdf } from "@/lib/generate-pdf";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
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

    if (
      handover.userId !== session.user.id &&
      session.user.role !== "admin"
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { buffer, filename } = await generateHandoverPdf(id);

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("[PDF] Generation failed:", error);
    return NextResponse.json(
      { error: "Failed to generate PDF" },
      { status: 500 }
    );
  }
}
