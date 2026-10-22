export interface Metadata {
  countries: Record<string, string>;
  currencies: string[];
  departments: string[];
}
export interface EmployeeInput {
  employee_code: string;
  name: string;
  email: string;
  country: string;
  department: string;
  job_title: string;
  hired_on: string;
  currency: string;
  annual_salary: string;
  status: "active" | "inactive";
}
export interface Employee extends EmployeeInput {
  id: number;
  version: number;
  created_at: string;
  updated_at: string;
}
export interface AuditEvent {
  id: number;
  employee_id: number;
  action: string;
  actor: string;
  reason: string;
  before: Employee | null;
  after: Employee;
  created_at: string;
}
export interface EmployeeDetail {
  employee: Employee;
  history: AuditEvent[];
}
export interface DirectoryResult {
  items: Employee[];
  total: number;
  page: number;
  page_size: number;
}
export interface Statistics {
  headcount: number;
  total: string;
  mean: string | null;
  median: string | null;
  minimum: string | null;
  maximum: string | null;
}
export interface Report {
  currency: string;
  basis: string;
  group_by: string;
  summary: Statistics;
  groups: (Statistics & { label: string })[];
  organization: { active: number; inactive: number };
  currencies: { currency: string; headcount: number }[];
}
export interface ImportPreview {
  valid: boolean;
  total_rows: number;
  valid_rows: number;
  error_count: number;
  errors: { row: number; message: string }[];
  preview: EmployeeInput[];
  checksum: string;
}
export interface Session {
  name: string;
  csrf_token: string;
}
