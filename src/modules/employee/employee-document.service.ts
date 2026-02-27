import { createSignedDownloadUrl, createSignedUploadUrl } from "@/lib/storage/s3";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const allowedMimeTypes = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg"
]);

const schema = z.object({
  orgId: z.string().min(1),
  employeeId: z.string().min(1),
  originalFilename: z.string().min(1).max(200),
  mimeType: z.string().min(1),
  sizeBytes: z.number().int().positive().max(10 * 1024 * 1024),
  uploadedByUserId: z.string().optional()
});

export class EmployeeDocumentService {
  async createUploadSession(input: unknown) {
    const data = schema.parse(input);
    if (!allowedMimeTypes.has(data.mimeType)) {
      throw new Error("Unsupported file type");
    }

    const suffix = data.originalFilename.replace(/[^a-zA-Z0-9._-]/g, "_");
    const key = `${data.orgId}/${data.employeeId}/${Date.now()}-${suffix}`;
    const signedUploadUrl = await createSignedUploadUrl({
      key,
      contentType: data.mimeType
    });

    const record = await prisma.employeeDocument.create({
      data: {
        orgId: data.orgId,
        employeeId: data.employeeId,
        storageKey: key,
        originalFilename: data.originalFilename,
        mimeType: data.mimeType,
        sizeBytes: data.sizeBytes,
        uploadedByUserId: data.uploadedByUserId
      }
    });

    return { documentId: record.id, storageKey: key, signedUploadUrl };
  }

  async createDownloadSession(input: {
    orgId: string;
    documentId: string;
  }): Promise<{ documentId: string; signedDownloadUrl: string }> {
    const document = await prisma.employeeDocument.findFirst({
      where: {
        id: input.documentId,
        orgId: input.orgId,
        isDeleted: false
      },
      select: {
        id: true,
        storageKey: true
      }
    });
    if (!document) {
      throw new Error("Document not found");
    }

    const signedDownloadUrl = await createSignedDownloadUrl({
      key: document.storageKey
    });

    return {
      documentId: document.id,
      signedDownloadUrl
    };
  }
}
