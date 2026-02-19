import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { handovers } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { Resend } from "resend";
import { generateHandoverPdf } from "@/lib/generate-pdf";

function getResend() {
  return new Resend(process.env.RESEND_API_KEY);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { to } = body;

    if (!to || typeof to !== "string") {
      return NextResponse.json(
        { error: "Recipient email is required" },
        { status: 400 }
      );
    }

    // Verify access
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

    const { error } = await getResend().emails.send({
      from: "Vehicle Handover <noreply@contact.frozyn.org>",
      to: [to],
      subject: "Vehicle Handover Report",
      html: `
        <h2>Vehicle Handover Report</h2>
        <p>Please find the attached vehicle handover report.</p>
        <p>Sent by ${session.user.name} (${session.user.email})</p>
      `,
      attachments: [
        {
          filename,
          content: buffer,
        },
      ],
    });

    if (error) {
      console.error("[Email] Resend error:", error);
      return NextResponse.json(
        { error: "Failed to send email" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Email] Error:", error);
    return NextResponse.json(
      { error: "Failed to send email" },
      { status: 500 }
    );
  }
}
