import { beforeEach, describe, expect, it, vi } from "vitest";
import { uploadImages } from "@/services/uploads";
const mock = vi.hoisted(() => ({
  count: 0,
  failAt: -1,
  destroyed: [] as string[],
}));
vi.mock("uploadthing/server", () => ({
  UTApi: class {
    async uploadFiles() {
      const n = mock.count++;
      if (n === mock.failAt)
        return { data: null, error: { message: "Provider failure" } };
      return {
        data: { ufsUrl: `https://test.ufs.sh/f/${n}.jpg`, key: `image-${n}` },
        error: null,
      };
    }
    async deleteFiles(key: string) {
      mock.destroyed.push(key);
    }
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
  vi.stubEnv("UPLOADTHING_TOKEN", "test");
  mock.count = 0;
  mock.failAt = -1;
  mock.destroyed = [];
});
describe("UploadThing image uploads", () => {
  it("returns multiple HTTPS image URLs in upload order", async () => {
    const images = await uploadImages(request([jpeg(), jpeg()]));
    expect(images).toEqual([
      {
        imageUrl: "https://test.ufs.sh/f/0.jpg",
        publicId: "image-0",
      },
      {
        imageUrl: "https://test.ufs.sh/f/1.jpg",
        publicId: "image-1",
      },
    ]);
  });
  it("rejects fake images and SVG before calling UploadThing", async () => {
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
    vi.stubEnv("UPLOADTHING_TOKEN", "");
    await expect(uploadImages(request([jpeg()]))).rejects.toMatchObject({
      status: 503,
    });
  });
});
