import { requireAuth } from "@/lib/auth-helpers";
import { getHandover } from "@/lib/actions/handovers";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PhotoGallery } from "@/components/photo-gallery";
import { CHECK_ITEM_LABELS, DELIVERY_CHECK_ITEM_LABELS, type CheckItemKey, type DeliveryCheckItemKey } from "@/lib/check-items";
import { EmailModal } from "@/components/email-modal";
import { DeleteHandoverButton } from "@/components/delete-handover-button";
import {
  Download,
  Pencil,
  CheckCircle,
  XCircle,
  ArrowLeft,
} from "lucide-react";

export default async function HandoverReviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAuth();
  const session = await getServerSession(authOptions);
  const isAdmin = session?.user?.role === "admin";
  const canEdit = isAdmin || session?.user?.canEdit === true;
  const canDelete = isAdmin || session?.user?.canDelete === true;
  const { id } = await params;
  const handover = await getHandover(id);
  if (!handover) notFound();

  const isDelivery = handover.type === "delivery";

  const checksMap = new Map(
    handover.checks.map((c) => [c.checkItem, c])
  );

  const signaturePhoto = handover.photos.find((p) => p.category === "signature");
  const v5Photos = handover.photos.filter((p) => p.category === "v5");
  const regularPhotos = handover.photos.filter(
    (p) => p.category !== "signature" && p.category !== "v5"
  );

  const allLabels: Record<string, string> = {
    ...CHECK_ITEM_LABELS,
    ...DELIVERY_CHECK_ITEM_LABELS,
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3">
        <Link href="/dashboard">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold truncate">
            {handover.vehicle.make} {handover.vehicle.model}
          </h1>
          <p className="text-sm text-muted-foreground">
            {handover.vehicle.registration} &middot;{" "}
            {new Date(handover.date).toLocaleDateString()}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Badge variant="outline">
            {isDelivery ? "Delivery" : "Collection"}
          </Badge>
          <Badge variant={handover.status === "completed" ? "success" : "warning"}>
            {handover.status}
          </Badge>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <a href={`/handovers/${id}/pdf`} target="_blank" rel="noreferrer">
          <Button variant="outline" className="min-h-[44px]">
            <Download className="h-4 w-4 mr-2" />
            Download PDF
          </Button>
        </a>
        <EmailModal handoverId={id} />
        {(handover.status === "draft" || canEdit) && (
          <Link href={`/handovers/${id}/edit`}>
            <Button variant="outline" className="min-h-[44px]">
              <Pencil className="h-4 w-4 mr-2" />
              Edit
            </Button>
          </Link>
        )}
        {canDelete && <DeleteHandoverButton handoverId={id} />}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Vehicle Details</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
            <div>
              <dt className="text-muted-foreground">Date</dt>
              <dd className="font-medium">
                {new Date(handover.date).toLocaleDateString()}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Inspector</dt>
              <dd className="font-medium">{handover.name}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Make</dt>
              <dd className="font-medium">{handover.vehicle.make}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Model</dt>
              <dd className="font-medium">{handover.vehicle.model}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Registration</dt>
              <dd className="font-medium">{handover.vehicle.registration}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Mileage</dt>
              <dd className="font-medium">
                {handover.mileage?.toLocaleString() || "N/A"}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      {/* Check Sheet — works for both collection and delivery checks */}
      {handover.checks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              {isDelivery ? "Vehicle Checks & Delivery Checklist" : "Check Sheet"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {Array.from(checksMap.entries()).map(([key, check]) => (
                <div
                  key={key}
                  className="flex items-start gap-3 py-2 border-b border-border last:border-0"
                >
                  {check.checked ? (
                    <CheckCircle className="h-5 w-5 text-success shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">
                      {allLabels[key as CheckItemKey | DeliveryCheckItemKey] || key}
                    </p>
                    {check.comments && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {check.comments}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tyre info — collection only */}
      {!isDelivery && handover.tyres.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Tyre Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 font-medium">Position</th>
                    <th className="text-left py-2 font-medium">Size</th>
                    <th className="text-left py-2 font-medium">Depth</th>
                    <th className="text-left py-2 font-medium">Brand</th>
                    <th className="text-left py-2 font-medium">Type</th>
                  </tr>
                </thead>
                <tbody>
                  {handover.tyres.map((t) => (
                    <tr key={t.id} className="border-b border-border last:border-0">
                      <td className="py-2 font-medium">{t.position}</td>
                      <td className="py-2">{t.size || "-"}</td>
                      <td className="py-2">{t.depth || "-"}</td>
                      <td className="py-2">{t.brand || "-"}</td>
                      <td className="py-2">{t.tyreType === "run_flat" ? "Run Flat" : "Normal"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* V5 Document — delivery only */}
      {isDelivery && v5Photos.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">V5 Document</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {v5Photos.map((photo) => (
                <div key={photo.id} className="rounded-lg overflow-hidden border border-border">
                  <Image
                    src={photo.blobUrl}
                    alt={photo.caption || "V5 Document"}
                    width={500}
                    height={350}
                    className="w-full h-auto object-cover"
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Customer Signature — delivery only */}
      {isDelivery && signaturePhoto && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Customer Signature</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {signaturePhoto.caption && (
              <div>
                <p className="text-xs text-muted-foreground">Signed by</p>
                <p className="text-sm font-medium">{signaturePhoto.caption}</p>
              </div>
            )}
            <div className="rounded-lg border border-border bg-white p-4 max-w-md">
              <Image
                src={signaturePhoto.blobUrl}
                alt="Customer Signature"
                width={600}
                height={200}
                className="w-full h-auto"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Regular photos (collection photos, or any non-v5/non-signature) */}
      {regularPhotos.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Photos</CardTitle>
          </CardHeader>
          <CardContent>
            <PhotoGallery photos={regularPhotos} />
          </CardContent>
        </Card>
      )}

      {handover.otherComments && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Other Comments</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{handover.otherComments}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
