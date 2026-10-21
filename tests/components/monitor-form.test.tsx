import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MonitorForm } from "@/components/monitors/monitor-form";

const push = vi.fn();
const refresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, refresh }),
}));

const fetchMock = vi.fn();

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

async function fillForm(name: string, url: string) {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText("Name"), name);
  const urlInput = screen.getByLabelText("URL");
  await user.clear(urlInput);
  await user.type(urlInput, url);
  return user;
}

describe("MonitorForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", fetchMock);
  });

  it("shows inline errors and does not submit invalid input", async () => {
    render(<MonitorForm />);
    const user = await fillForm(" ", "ftp://example.com");

    await user.click(screen.getByRole("button", { name: "Create monitor" }));

    expect(screen.getByText("Enter a name")).toBeInTheDocument();
    expect(
      screen.getByText("Only http and https URLs can be monitored"),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("URL")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("submits the monitor with numeric settings and opens it", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(201, { monitor: { id: "mon_123" } }),
    );
    render(<MonitorForm />);
    const user = await fillForm(
      "Billing API",
      "https://billing.example.com/health",
    );

    await user.selectOptions(screen.getByLabelText("Check interval"), "60");
    await user.click(screen.getByRole("button", { name: "Create monitor" }));

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/monitors");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body)).toEqual({
      name: "Billing API",
      url: "https://billing.example.com/health",
      method: "GET",
      expectedStatus: 200,
      intervalSeconds: 60,
      timeoutMs: 10000,
    });
    expect(push).toHaveBeenCalledWith("/monitors/mon_123");
  });

  it("shows errors returned by the server next to the right field", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(422, {
        error: "Please correct the highlighted fields.",
        fieldErrors: {
          url: "Private, loopback and reserved addresses cannot be monitored",
        },
      }),
    );
    render(<MonitorForm />);
    const user = await fillForm("Router", "http://192.168.1.1/");

    await user.click(screen.getByRole("button", { name: "Create monitor" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Please correct the highlighted fields.",
    );
    expect(
      screen.getByText(
        "Private, loopback and reserved addresses cannot be monitored",
      ),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("URL")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    expect(push).not.toHaveBeenCalled();
  });

  it("updates an existing monitor with PATCH", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(200, { monitor: { id: "mon_1" } }),
    );
    render(
      <MonitorForm
        monitorId="mon_1"
        initialValues={{
          name: "Old name",
          url: "https://example.com/",
          method: "HEAD",
          expectedStatus: 204,
          intervalSeconds: 600,
          timeoutMs: 5000,
        }}
      />,
    );
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "Save changes" }));

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/monitors/mon_1");
    expect(init.method).toBe("PATCH");
    expect(JSON.parse(init.body)).toMatchObject({
      method: "HEAD",
      expectedStatus: 204,
      intervalSeconds: 600,
    });
  });
});
