import { v2 as cloudinary, type UploadApiResponse } from "cloudinary";
import { ApiError, readLimitedBody } from "@/lib/api";
function configure() {
  const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } =
    process.env;
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET)
    throw new ApiError(503, "Image storage is not configured");
  cloudinary.config({
    cloud_name: CLOUDINARY_CLOUD_NAME,
    api_key: CLOUDINARY_API_KEY,
    api_secret: CLOUDINARY_API_SECRET,
    secure: true,
  });
}
function isImage(bytes: Buffer) {
  return (
    (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) ||
    bytes
      .subarray(0, 8)
      .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) ||
    (bytes.toString("ascii", 0, 4) === "RIFF" &&
      bytes.toString("ascii", 8, 12) === "WEBP")
  );
}
function upload(bytes: Buffer): Promise<UploadApiResponse> {
  return new Promise((resolve, reject) =>
    cloudinary.uploader
      .upload_stream(
        {
          folder: "victor-pedro/products",
          resource_type: "image",
          allowed_formats: ["jpg", "jpeg", "png", "webp"],
          overwrite: false,
        },
        (error, result) =>
          error || !result
            ? reject(error ?? new Error("Upload failed"))
            : resolve(result),
      )
      .end(bytes),
  );
}
export async function uploadImages(request: Request) {
  configure();
  if (!request.headers.get("content-type")?.startsWith("multipart/form-data"))
    throw new ApiError(415, "Use multipart/form-data with files fields");
  if (Number(request.headers.get("content-length") ?? 0) > 34 * 1024 * 1024)
    throw new ApiError(413, "Upload exceeds 32 MB");
  let form: FormData;
  try {
    const raw = await readLimitedBody(request, 34 * 1024 * 1024);
    form = await new Response(new Uint8Array(raw), {
      headers: { "Content-Type": request.headers.get("content-type")! },
    }).formData();
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(400, "Invalid multipart form");
  }
  const files = form.getAll("files");
  if (
    !files.length ||
    files.length > 12 ||
    files.some((f) => !(f instanceof File))
  )
    throw new ApiError(
      422,
      "Upload between 1 and 12 images using files fields",
    );
  const images = files as File[];
  if (
    images.some((f) => f.size < 1 || f.size > 8 * 1024 * 1024) ||
    images.reduce((sum, f) => sum + f.size, 0) > 32 * 1024 * 1024
  )
    throw new ApiError(
      413,
      "Each image must be at most 8 MB; total at most 32 MB",
    );
  const buffers = await Promise.all(
    images.map(async (f) => Buffer.from(await f.arrayBuffer())),
  );
  if (buffers.some((b) => !isImage(b)))
    throw new ApiError(422, "Only JPEG, PNG and WebP images are accepted");
  const results = await Promise.allSettled(buffers.map(upload));
  if (results.some((r) => r.status === "rejected")) {
    await Promise.allSettled(
      results
        .filter((r) => r.status === "fulfilled")
        .map((r) => cloudinary.uploader.destroy(r.value.public_id)),
    );
    throw new ApiError(502, "Image upload failed. Please try again.");
  }
  return results
    .filter((r) => r.status === "fulfilled")
    .map((r) => ({
      imageUrl: r.value.secure_url,
      publicId: r.value.public_id,
    }));
}
