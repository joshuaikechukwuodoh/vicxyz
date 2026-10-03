"use client";

import { useEffect, useState, type FormEvent } from "react";
import { CarFront, Upload, LogOut, Plus } from "lucide-react";
import type { CategoryDto, ProductDto } from "@/lib/catalog-client";
import { uploadFiles } from "@/lib/media-upload-client";
import { SITE } from "@/lib/config";
import type { OrderStatus } from "@/types/api";

type Order = {
  id: string;
  reference: string;
  customerName: string;
  customerPhone: string;
  totalAmount: string;
  status: OrderStatus;
};
const transitions: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ["CONTACTED", "CONFIRMED", "CANCELLED"],
  CONTACTED: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["COMPLETED", "CANCELLED"],
  COMPLETED: [],
  CANCELLED: [],
};
const blank = {
  name: "",
  slug: "",
  description: "",
  price: "",
  quantity: 1,
  condition: "Foreign Used",
  categoryId: "",
  images: [] as string[],
  videos: [] as string[],
};
async function api<T>(url: string, method = "GET", body?: unknown): Promise<T> {
  const response = await fetch(url, {
    method,
    cache: "no-store",
    headers:
      body instanceof FormData || body === undefined
        ? undefined
        : { "Content-Type": "application/json" },
    body:
      body === undefined
        ? undefined
        : body instanceof FormData
          ? body
          : JSON.stringify(body),
  });
  const result = await response.json();
  if (!response.ok)
    throw new Error(
      result.error?.issues
        ?.map(
          (issue: { path: string[]; message: string }) =>
            `${issue.path.join(".")}: ${issue.message}`,
        )
        .join("; ") ||
        result.error?.message ||
        "Request failed. Please try again.",
    );
  return result.data;
}
const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

export default function AdminPage() {
  const [user, setUser] = useState<{ name: string } | null>(null);
  const [checking, setChecking] = useState(true);
  const [busy, setBusy] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [categories, setCategories] = useState<CategoryDto[]>([]);
  const [products, setProducts] = useState<ProductDto[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [orderPage, setOrderPage] = useState(1);
  const [orderTotal, setOrderTotal] = useState(0);
  const [draft, setDraft] = useState(blank);
  const [editing, setEditing] = useState<string | null>(null);
  const [category, setCategory] = useState({
    name: "",
    slug: "",
    imageUrl: "",
  });
  const [categoryId, setCategoryId] = useState<string | null>(null);

  async function refresh() {
    const [c, p, o] = await Promise.all([
      api<CategoryDto[]>("/api/admin/categories"),
      api<{ items: ProductDto[]; pagination: { totalPages: number } }>(
        `/api/admin/products?limit=12&page=${page}`,
      ),
      api<{ items: Order[]; pagination: { total: number } }>(
        `/api/admin/orders?limit=12&page=${orderPage}`,
      ),
    ]);
    setCategories(c);
    setProducts(p.items);
    setOrders(o.items);
    setTotalPages(p.pagination.totalPages);
    setOrderTotal(o.pagination.total);
  }
  useEffect(() => {
    api<{ name: string }>("/api/admin/auth/me")
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setChecking(false));
  }, []);
  useEffect(() => {
    if (user) refresh().catch((e: Error) => setError(e.message));
  }, [user, page, orderPage]); // eslint-disable-line react-hooks/exhaustive-deps
  async function run(action: () => Promise<void>, success = "") {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await action();
      setMessage(success);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  }
  async function upload(
    files: FileList | null,
    target: "product" | "category" | "video",
  ) {
    if (!files?.length || busy) return;
    const selection = Array.from(files);
    await run(async () => {
      const video = target === "video";
      const maximum = video ? 3 : target === "product" ? 12 : 1;
      const previous = video
        ? draft.videos.length
        : target === "product"
          ? draft.images.length
          : 0;
      if (selection.length + previous > maximum)
        throw new Error(
          `Use at most ${maximum} ${video ? "videos" : "photos"}.`,
        );
      const types = video
        ? ["video/mp4", "video/webm"]
        : ["image/jpeg", "image/png", "image/webp"];
      const limit = (video ? 64 : 8) * 1024 * 1024;
      if (
        selection.some(
          (file) =>
            !types.includes(file.type) || file.size < 1 || file.size > limit,
        )
      )
        throw new Error(
          video
            ? "Choose MP4 or WebM videos up to 64 MB each."
            : "Choose JPEG, PNG or WebP photos up to 8 MB each.",
        );
      setUploadProgress(0);
      try {
        const progress = new Map<string, number>();
        const uploaded = await uploadFiles(
          target === "category" ? "categoryImage" : "productMedia",
          {
            files: selection,
            onUploadProgress: ({ file, progress: percent }) => {
              progress.set(file.name, percent);
              setUploadProgress(
                Math.round(
                  [...progress.values()].reduce((sum, n) => sum + n, 0) /
                    selection.length,
                ),
              );
            },
          },
        );
        const urls = uploaded.map((file) => file.ufsUrl);
        if (video) setDraft((d) => ({ ...d, videos: [...d.videos, ...urls] }));
        else if (target === "product")
          setDraft((d) => ({ ...d, images: [...d.images, ...urls] }));
        else setCategory((c) => ({ ...c, imageUrl: urls[0] }));
      } finally {
        setUploadProgress(null);
      }
    }, "Upload complete. Save the form to publish your media.");
  }
  function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    void run(async () =>
      setUser(
        await api("/api/admin/auth/login", "POST", {
          email: String(data.get("email")).trim(),
          password: data.get("password"),
        }),
      ),
    );
  }
  if (checking)
    return (
      <section className="section-pad" role="status">
        Checking your session…
      </section>
    );
  return (
    <section className="section-pad admin-page">
      <div className="section-header">
        <div>
          <p className="eyebrow">
            <CarFront size={18} /> {SITE.name} management
          </p>
          <h2>{user ? `Welcome, ${user.name}.` : "Admin sign in."}</h2>
        </div>
        {user && (
          <button
            disabled={busy}
            className="button dark"
            onClick={() =>
              void run(async () => {
                await api("/api/admin/auth/logout", "POST");
                setUser(null);
                setDraft(blank);
                setProducts([]);
                setOrders([]);
              })
            }
          >
            <LogOut size={16} /> Sign out
          </button>
        )}
      </div>
      {error && (
        <p className="admin-error" role="alert">
          {error}
        </p>
      )}
      {message && (
        <p className="admin-success" role="status">
          {message}
        </p>
      )}
      {busy && <p role="status">Working… please keep this page open.</p>}
      {!user ? (
        <form className="admin-panel admin-login" onSubmit={login}>
          <p>
            Sign in to upload photos and videos, publish products, and manage
            orders.
          </p>
          <label>
            Email
            <input name="email" type="email" required autoComplete="username" />
          </label>
          <label>
            Password
            <input
              name="password"
              type="password"
              required
              autoComplete="current-password"
            />
          </label>
          <button className="button dark" disabled={busy}>
            Sign in
          </button>
        </form>
      ) : (
        <>
          <div className="admin-layout">
            <form
              className="admin-panel"
              onSubmit={(e) => {
                e.preventDefault();
                void run(async () => {
                  await api(
                    `/api/admin/products${editing ? `/${editing}` : ""}`,
                    editing ? "PATCH" : "POST",
                    draft,
                  );
                  setDraft(blank);
                  setEditing(null);
                  await refresh();
                }, "Product saved and visible in the shop.");
              }}
            >
              <h3>{editing ? "Edit product" : "Add a product"}</h3>
              <fieldset disabled={busy}>
                <label>
                  Name
                  <input
                    required
                    minLength={2}
                    maxLength={180}
                    value={draft.name}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        name: e.target.value,
                        slug: editing ? draft.slug : slugify(e.target.value),
                      })
                    }
                  />
                </label>
                <label>
                  Page slug
                  <input
                    required
                    pattern="[a-z0-9]+(-[a-z0-9]+)*"
                    value={draft.slug}
                    onChange={(e) =>
                      setDraft({ ...draft, slug: e.target.value })
                    }
                  />
                </label>
                <label>
                  Description
                  <textarea
                    required
                    maxLength={10000}
                    value={draft.description}
                    onChange={(e) =>
                      setDraft({ ...draft, description: e.target.value })
                    }
                  />
                </label>
                <div className="admin-fields">
                  <label>
                    Price (₦)
                    <input
                      required
                      type="number"
                      min="0"
                      max="999999999999.99"
                      step="0.01"
                      value={draft.price}
                      onChange={(e) =>
                        setDraft({ ...draft, price: e.target.value })
                      }
                    />
                  </label>
                  <label>
                    Quantity
                    <input
                      required
                      type="number"
                      min="0"
                      max="1000000"
                      value={draft.quantity}
                      onChange={(e) =>
                        setDraft({ ...draft, quantity: Number(e.target.value) })
                      }
                    />
                  </label>
                </div>
                <label>
                  Condition
                  <input
                    required
                    maxLength={100}
                    value={draft.condition}
                    onChange={(e) =>
                      setDraft({ ...draft, condition: e.target.value })
                    }
                  />
                </label>
                <label>
                  Category
                  <select
                    required
                    value={draft.categoryId}
                    onChange={(e) =>
                      setDraft({ ...draft, categoryId: e.target.value })
                    }
                  >
                    <option value="">Choose category</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="admin-upload">
                  <Upload size={20} /> Upload product photos
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    multiple
                    onChange={(e) => {
                      void upload(e.target.files, "product");
                      e.target.value = "";
                    }}
                  />
                </label>
                <p className="tiny-note">
                  Up to 12 photos, 8 MB each. The first photo is the cover.
                </p>
                <div className="admin-photos">
                  {draft.images.map((url, i) => (
                    <div key={`${url}-${i}`}>
                      <img src={url} alt={`Product photo ${i + 1}`} />
                      <button
                        type="button"
                        onClick={() =>
                          setDraft((d) => ({
                            ...d,
                            images: d.images.filter((_, n) => n !== i),
                          }))
                        }
                      >
                        Remove {i + 1}
                      </button>
                      {i > 0 && (
                        <button
                          type="button"
                          onClick={() =>
                            setDraft((d) => ({
                              ...d,
                              images: [
                                url,
                                ...d.images.filter((_, n) => n !== i),
                              ],
                            }))
                          }
                        >
                          Make cover
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <label className="admin-upload">
                  <Upload size={20} /> Upload product videos
                  <input
                    type="file"
                    accept="video/mp4,video/webm"
                    multiple
                    onChange={(event) => {
                      void upload(event.target.files, "video");
                      event.target.value = "";
                    }}
                  />
                </label>
                <p className="tiny-note">
                  Up to 3 MP4 or WebM videos, 64 MB each. Customers can play
                  them on the product page.
                </p>
                <div className="admin-video-previews">
                  {draft.videos.map((url, i) => (
                    <div key={url + i}>
                      <video
                        src={url}
                        controls
                        playsInline
                        preload="metadata"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setDraft((d) => ({
                            ...d,
                            videos: d.videos.filter((_, n) => n !== i),
                          }))
                        }
                      >
                        Remove video {i + 1}
                      </button>
                    </div>
                  ))}
                </div>
                <button className="button dark" disabled={!draft.images.length}>
                  <Plus size={16} />
                  {editing ? "Save changes" : "Publish product"}
                </button>
                {editing && (
                  <button
                    type="button"
                    className="button"
                    onClick={() => {
                      setDraft(blank);
                      setEditing(null);
                    }}
                  >
                    Cancel edit
                  </button>
                )}
              </fieldset>
            </form>
            <div>
              <form
                className="admin-panel"
                onSubmit={(e) => {
                  e.preventDefault();
                  void run(async () => {
                    await api(
                      `/api/admin/categories${categoryId ? `/${categoryId}` : ""}`,
                      categoryId ? "PATCH" : "POST",
                      category,
                    );
                    setCategory({ name: "", slug: "", imageUrl: "" });
                    setCategoryId(null);
                    await refresh();
                  }, "Category saved.");
                }}
              >
                <h3>{categoryId ? "Edit category" : "Add a category"}</h3>
                <fieldset disabled={busy}>
                  <label>
                    Name
                    <input
                      required
                      minLength={2}
                      value={category.name}
                      onChange={(e) =>
                        setCategory({
                          ...category,
                          name: e.target.value,
                          slug: categoryId
                            ? category.slug
                            : slugify(e.target.value),
                        })
                      }
                    />
                  </label>
                  <label>
                    Slug
                    <input
                      required
                      pattern="[a-z0-9]+(-[a-z0-9]+)*"
                      value={category.slug}
                      onChange={(e) =>
                        setCategory({ ...category, slug: e.target.value })
                      }
                    />
                  </label>
                  <label>
                    Category photo
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={(e) => {
                        void upload(e.target.files, "category");
                        e.target.value = "";
                      }}
                    />
                  </label>
                  {category.imageUrl && (
                    <img
                      className="admin-category-preview"
                      src={category.imageUrl}
                      alt="Category preview"
                    />
                  )}
                  <button className="button dark" disabled={!category.imageUrl}>
                    Save category
                  </button>
                  {categoryId && (
                    <button
                      className="button"
                      type="button"
                      onClick={() => {
                        setCategoryId(null);
                        setCategory({ name: "", slug: "", imageUrl: "" });
                      }}
                    >
                      Cancel
                    </button>
                  )}
                </fieldset>
              </form>
              <div className="admin-panel">
                <h3>Categories</h3>
                {categories.map((c) => (
                  <div className="admin-row" key={c.id}>
                    <span>{c.name}</span>
                    <button
                      disabled={busy}
                      onClick={() => {
                        setCategoryId(c.id);
                        setCategory({
                          name: c.name,
                          slug: c.slug,
                          imageUrl: c.imageUrl,
                        });
                      }}
                    >
                      Edit
                    </button>
                    <button
                      disabled={busy}
                      onClick={() => {
                        if (
                          window.confirm(
                            `Delete ${c.name}? Categories containing products cannot be deleted.`,
                          )
                        )
                          void run(async () => {
                            await api(
                              `/api/admin/categories/${c.id}`,
                              "DELETE",
                            );
                            await refresh();
                          }, "Category deleted.");
                      }}
                    >
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="admin-panel">
            <h3>Products</h3>
            {products.length === 0 && (
              <p>No products yet. Add your first listing above.</p>
            )}
            {products.map((p) => (
              <div className="admin-row" key={p.id}>
                <img
                  src={p.images[0]?.imageUrl ?? "/images/category-cars.svg"}
                  alt={p.name}
                />
                <div>
                  <strong>{p.name}</strong>
                  <p>
                    ₦{Number(p.price).toLocaleString("en-NG")} · {p.quantity}{" "}
                    available · {p.status.replaceAll("_", " ")}
                  </p>
                </div>
                <button
                  disabled={busy}
                  onClick={() => {
                    setEditing(p.id);
                    setDraft({
                      name: p.name,
                      slug: p.slug,
                      description: p.description,
                      price: p.price,
                      quantity: p.quantity,
                      condition: p.condition,
                      categoryId: p.category.id,
                      images: p.images.map((i) => i.imageUrl),
                      videos: (p.videos ?? []).map((v) => v.videoUrl),
                    });
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                >
                  Edit
                </button>
                <button
                  disabled={busy}
                  onClick={() => {
                    if (
                      window.confirm(
                        `Delete ${p.name}? This removes the listing from the shop.`,
                      )
                    )
                      void run(async () => {
                        await api(`/api/admin/products/${p.id}`, "DELETE");
                        await refresh();
                      }, "Product deleted.");
                  }}
                >
                  Delete
                </button>
              </div>
            ))}
            <div className="catalog-pagination">
              <button
                disabled={busy || page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </button>
              <span>
                Page {page} of {Math.max(1, totalPages)}
              </span>
              <button
                disabled={busy || page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </button>
            </div>
          </div>
          <div className="admin-panel">
            <h3>Orders</h3>
            {!orders.length && <p>No orders yet.</p>}
            {orders.map((o) => (
              <div className="admin-row" key={o.id}>
                <div>
                  <strong>{o.reference}</strong>
                  <p>
                    {o.customerName} · {o.customerPhone} · ₦
                    {Number(o.totalAmount).toLocaleString("en-NG")}
                  </p>
                </div>
                <label>
                  Status
                  <select
                    disabled={busy || !transitions[o.status].length}
                    value={o.status}
                    onChange={(e) => {
                      const status = e.target.value;
                      if (
                        window.confirm(
                          `Set ${o.reference} to ${status}? Confirming deducts stock; cancelling a confirmed order restores stock.`,
                        )
                      )
                        void run(async () => {
                          await api(
                            `/api/admin/orders/${o.id}/status`,
                            "PATCH",
                            { status },
                          );
                          await refresh();
                        }, "Order updated.");
                    }}
                  >
                    <option>{o.status}</option>
                    {transitions[o.status].map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                </label>
              </div>
            ))}
            <div className="catalog-pagination">
              <button
                disabled={busy || orderPage <= 1}
                onClick={() => setOrderPage((p) => p - 1)}
              >
                Previous
              </button>
              <span>Page {orderPage}</span>
              <button
                disabled={busy || orderPage * 12 >= orderTotal}
                onClick={() => setOrderPage((p) => p + 1)}
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
