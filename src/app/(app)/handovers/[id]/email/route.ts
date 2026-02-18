import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Resend } from "resend";

function getResend() {
  return new Resend(process.env.RESEND_API_KEY);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

  // Fetch the PDF from our own endpoint
  const origin = request.nextUrl.origin;
  const pdfRes = await fetch(`${origin}/handovers/${id}/pdf`, {
    headers: {
      cookie: request.headers.get("cookie") || "",
    },
  });

  if (!pdfRes.ok) {
    return NextResponse.json(
      { error: "Failed to generate PDF" },
      { status: 500 }
    );
  }

  const pdfBuffer = Buffer.from(await pdfRes.arrayBuffer());
  const filename =
    pdfRes.headers
      .get("content-disposition")
      ?.match(/filename="(.+)"/)?.[1] || "handover-report.pdf";

  const { error } = await getResend().emails.send({
    from: "Vehicle Handover <onboarding@resend.dev>",
    to: [to],
    subject: `Vehicle Handover Report`,
    html: `
      <h2>Vehicle Handover Report</h2>
      <p>Please find the attached vehicle handover report.</p>
      <p>Sent by ${session.user.name} (${session.user.email})</p>
    `,
    attachments: [
      {
        filename,
        content: pdfBuffer,
      },
    ],
  });

  if (error) {
    return NextResponse.json(
      { error: "Failed to send email" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
