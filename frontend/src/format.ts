export function money(value: string | null, currency: string): string {
  if (value === null) return "—";
  const [whole, fraction = "00"] = value.split(".");
  const formatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    currencyDisplay: "narrowSymbol",
    minimumFractionDigits: 2,
  });
  return formatter
    .formatToParts(BigInt(whole))
    .map((part) =>
      part.type === "fraction" ? fraction.padEnd(2, "0") : part.value,
    )
    .join("");
}
export function count(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}
export function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}
export function dateTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}
export const actionLabels: Record<string, string> = {
  created: "Employee added",
  imported: "Employee imported",
  seeded: "Initial salary",
  salary_changed: "Salary updated",
  profile_updated: "Profile updated",
  deactivated: "Employee deactivated",
  reactivated: "Employee reactivated",
};
