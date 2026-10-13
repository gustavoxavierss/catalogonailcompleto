import { beforeEach, describe, it, expect, vi } from "vitest";
const mock = vi.hoisted(() => ({
  identity: vi.fn(),
  adminDb: vi.fn(),
  generate: vi.fn(),
}));
vi.mock("../src/lib/server", async () => {
  const actual =
    await vi.importActual<typeof import("../src/lib/server")>(
      "../src/lib/server",
    );
  return {
    ...actual,
    identity: mock.identity,
    adminDb: mock.adminDb,
    track: vi.fn(),
  };
});
vi.mock("../src/lib/pdf", () => ({ generatePaidPdf: mock.generate }));
import { POST as download } from "../src/app/api/orders/[id]/download/route";
import { POST as webhook } from "../src/app/api/payments/webhook/qiapay/route";
import { AppError } from "../src/lib/server";
const request = () =>
  new Request("https://example.test/api/orders/test/download", {
    method: "POST",
    headers: { origin: "https://example.test" },
  });
beforeEach(() => {
  vi.clearAllMocks();
  delete process.env.APP_URL;
});
describe("Rotas protegidas", () => {
  it("não baixa sem autenticação", async () => {
    mock.identity.mockRejectedValue(new AppError("Entre", 401));
    expect(
      (await download(request(), { params: Promise.resolve({ id: "other" }) }))
        .status,
    ).toBe(401);
    expect(mock.generate).not.toHaveBeenCalled();
  });
  it("nega origem externa antes de consultar conta", async () => {
    expect(
      (
        await download(
          new Request("https://example.test/api/orders/x/download", {
            method: "POST",
            headers: { origin: "https://evil.test" },
          }),
          { params: Promise.resolve({ id: "x" }) },
        )
      ).status,
    ).toBe(403);
    expect(mock.identity).not.toHaveBeenCalled();
  });
  it.each([
    "pending",
    "processing",
    "failed",
    "expired",
    "cancelled",
    "refunded",
  ])("não gera PDF com status %s", async (status) => {
    mock.identity.mockResolvedValue({ user: { id: "u" } });
    const q: any = {
      select: () => q,
      eq: () => q,
      maybeSingle: async () => ({
        data: { status, catalog_id: "c" },
        error: null,
      }),
    };
    mock.adminDb.mockReturnValue({ from: () => q });
    expect(
      (await download(request(), { params: Promise.resolve({ id: "o" }) }))
        .status,
    ).toBe(403);
    expect(mock.generate).not.toHaveBeenCalled();
  });
  it("ID de outro usuário não encontra pedido", async () => {
    mock.identity.mockResolvedValue({ user: { id: "u" } });
    const eq = vi.fn(() => q);
    const q: any = {
      select: () => q,
      eq,
      maybeSingle: async () => ({ data: null, error: null }),
    };
    mock.adminDb.mockReturnValue({ from: () => q });
    expect(
      (
        await download(request(), {
          params: Promise.resolve({ id: "foreign" }),
        })
      ).status,
    ).toBe(404);
    expect(eq).toHaveBeenCalledWith("user_id", "u");
    expect(mock.generate).not.toHaveBeenCalled();
  });
  it("webhook forjado não libera PDF sem adaptador verificado", async () => {
    const r = await webhook(
      new Request("https://example.test/api/payments/webhook/qiapay", {
        method: "POST",
        body: JSON.stringify({ status: "paid", amount: 1 }),
      }),
    );
    expect(r.status).toBe(503);
    expect(mock.generate).not.toHaveBeenCalled();
  });
});
