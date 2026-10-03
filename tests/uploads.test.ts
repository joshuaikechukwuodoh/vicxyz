import { beforeEach, describe, expect, it, vi } from "vitest";
import { uploadImages } from "@/services/uploads";
const mock = vi.hoisted(() => ({
  count: 0,
  failAt: -1,
  destroyed: [] as string[],
}));
vi.mock("cloudinary", () => ({
  v2: {
    config: vi.fn(),
    uploader: {
      upload_stream: (
        _options: unknown,
        callback: (error: unknown, result?: unknown) => void,
      ) => ({
        end: () => {
          const n = mock.count++;
          queueMicrotask(() =>
            n === mock.failAt
              ? callback(new Error("Provider failure"))
              : callback(null, {
                  secure_url: `https://res.cloudinary.com/test/image/upload/${n}.jpg`,
                  public_id: `image-${n}`,
                }),
          );
        },
      }),
      destroy: async (publicId: string) => {
        mock.destroyed.push(publicId);
      },
    },
  },
}));
function request(files: File[]) {
  const form = new FormData();
  files.forEach((file) => form.append("files", file));
  return new Request("http://localhost:3000/api/admin/uploads", {
    method: "POST",
    body: form,
  });
}
const jpeg = () =>
  new File([new Uint8Array([255, 216, 255, 224, 0, 1])], "car.jpg", {
    type: "image/jpeg",
  });
beforeEach(() => {
  vi.stubEnv("CLOUDINARY_CLOUD_NAME", "test");
  vi.stubEnv("CLOUDINARY_API_KEY", "test");
  vi.stubEnv("CLOUDINARY_API_SECRET", "test");
  mock.count = 0;
  mock.failAt = -1;
  mock.destroyed = [];
});
describe("Cloudinary image uploads", () => {
  it("returns multiple HTTPS image URLs in upload order", async () => {
    const images = await uploadImages(request([jpeg(), jpeg()]));
    expect(images).toEqual([
      {
        imageUrl: "https://res.cloudinary.com/test/image/upload/0.jpg",
        publicId: "image-0",
      },
      {
        imageUrl: "https://res.cloudinary.com/test/image/upload/1.jpg",
        publicId: "image-1",
      },
    ]);
  });
  it("rejects fake images and SVG before calling Cloudinary", async () => {
    await expect(
      uploadImages(
        request([
          new File(["pretend jpeg"], "car.jpg", { type: "image/jpeg" }),
        ]),
      ),
    ).rejects.toMatchObject({ status: 422 });
    await expect(
      uploadImages(
        request([
          new File(["<svg></svg>"], "a.svg", { type: "image/svg+xml" }),
        ]),
      ),
    ).rejects.toMatchObject({ status: 422 });
    expect(mock.count).toBe(0);
  });
  it("rejects empty batches, excessive image counts and oversized requests", async () => {
    await expect(uploadImages(request([]))).rejects.toMatchObject({
      status: 422,
    });
    await expect(
      uploadImages(request(Array.from({ length: 13 }, jpeg))),
    ).rejects.toMatchObject({ status: 422 });
    const large = new Request("http://localhost:3000/api/admin/uploads", {
      method: "POST",
      headers: {
        "Content-Type": "multipart/form-data; boundary=test",
        "Content-Length": String(35 * 1024 * 1024),
      },
      body: "small",
    });
    await expect(uploadImages(large)).rejects.toMatchObject({ status: 413 });
  });
  it("cleans up successful uploads when the batch partially fails", async () => {
    mock.failAt = 1;
    await expect(uploadImages(request([jpeg(), jpeg()]))).rejects.toMatchObject(
      { status: 502 },
    );
    expect(mock.destroyed).toEqual(["image-0"]);
  });
  it("returns a clear service-unavailable error for missing configuration", async () => {
    vi.stubEnv("CLOUDINARY_API_SECRET", "");
    await expect(uploadImages(request([jpeg()]))).rejects.toMatchObject({
      status: 503,
    });
  });
});
