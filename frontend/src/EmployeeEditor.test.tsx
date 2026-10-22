import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { EmployeeForm } from "./EmployeeEditor";
import { api, ApiError } from "./api";
import type { Employee, Metadata } from "./types";
vi.mock("./api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./api")>()),
  api: vi.fn(),
}));
const metadata: Metadata = {
  countries: { IN: "India", US: "United States" },
  currencies: ["INR", "USD"],
  departments: ["Engineering", "People"],
};
const employee: Employee = {
  id: 1,
  employee_code: "EMP-001",
  name: "Maya Shah",
  email: "maya@example.test",
  country: "IN",
  department: "Engineering",
  job_title: "Engineer",
  hired_on: "2024-01-01",
  currency: "INR",
  annual_salary: "1200000.10",
  status: "active",
  version: 2,
  created_at: "2024-01-01",
  updated_at: "2024-01-01",
};
afterEach(() => vi.clearAllMocks());
describe("salary editing", () => {
  it("sends exact salary text with the version and reason", async () => {
    vi.mocked(api).mockResolvedValue({});
    const saved = vi.fn();
    const user = userEvent.setup();
    render(
      <EmployeeForm employee={employee} metadata={metadata} onSaved={saved} />,
    );
    await user.clear(screen.getByLabelText("Annual base salary"));
    await user.type(screen.getByLabelText("Annual base salary"), "1400000.25");
    await user.type(
      screen.getByLabelText("Reason for change"),
      "Annual review",
    );
    await user.click(screen.getByRole("button", { name: "Save changes" }));
    await waitFor(() => expect(saved).toHaveBeenCalled());
    const options = vi.mocked(api).mock.calls[0][1];
    expect(JSON.parse(options!.body as string)).toMatchObject({
      annual_salary: "1400000.25",
      expected_version: 2,
      reason: "Annual review",
    });
  });
  it("retains user input and explains a concurrent edit conflict", async () => {
    vi.mocked(api).mockRejectedValue(
      new ApiError(409, "This record changed since you opened it."),
    );
    const user = userEvent.setup();
    const saved = vi.fn();
    render(
      <EmployeeForm employee={employee} metadata={metadata} onSaved={saved} />,
    );
    await user.type(screen.getByLabelText("Reason for change"), "Promotion");
    await user.click(screen.getByRole("button", { name: "Save changes" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "This record changed",
    );
    expect(screen.getByLabelText("Reason for change")).toHaveValue("Promotion");
    expect(saved).not.toHaveBeenCalled();
  });
  it("does not silently convert salary or currency when country changes", async () => {
    render(
      <EmployeeForm
        employee={employee}
        metadata={metadata}
        onSaved={vi.fn()}
      />,
    );
    await userEvent.selectOptions(screen.getByLabelText("Country"), "US");
    expect(screen.getByLabelText("Currency")).toHaveValue("INR");
    expect(screen.getByLabelText("Annual base salary")).toHaveValue(
      "1200000.10",
    );
  });
});
