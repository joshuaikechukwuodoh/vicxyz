import { createUploadthing, type FileRouter } from "uploadthing/next";
import { UploadThingError } from "uploadthing/server";
import { requireAdmin } from "@/lib/auth";
import { ApiError } from "@/lib/api";
const upload = createUploadthing();
export async function authorizeMediaUpload(request: Request) {
  try {
    const admin = await requireAdmin(request);
    return { adminId: admin.id };
  } catch (error) {
    throw new UploadThingError({
      code: "FORBIDDEN",
      message:
        error instanceof ApiError
          ? error.message
          : "Please sign in to upload media",
    });
  }
}
export const uploadRouter = {
  productMedia: upload(
    {
      image: { maxFileSize: "8MB", maxFileCount: 12 },
      video: { maxFileSize: "64MB", maxFileCount: 3 },
    },
    { awaitServerData: true },
  )
    .middleware(({ req }) => authorizeMediaUpload(req))
    .onUploadComplete(({ file }) => ({
      url: file.ufsUrl,
      key: file.key,
      type: file.type,
    })),
  categoryImage: upload(
    { image: { maxFileSize: "8MB", maxFileCount: 1 } },
    { awaitServerData: true },
  )
    .middleware(({ req }) => authorizeMediaUpload(req))
    .onUploadComplete(({ file }) => ({
      url: file.ufsUrl,
      key: file.key,
      type: file.type,
    })),
} satisfies FileRouter;
export type UploadRouter = typeof uploadRouter;
