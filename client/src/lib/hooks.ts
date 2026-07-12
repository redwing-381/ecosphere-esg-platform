import { useQuery } from "@tanstack/react-query";
import api from "./api";

export interface Profile {
  id: number;
  email: string;
  role: "admin" | "dept_head" | "employee";
  employee_id: number | null;
  name: string | null;
  department_id: number | null;
  department_name: string | null;
  job_title: string | null;
  xp_balance: number;
  points_balance: number;
}

export interface Department {
  id: number;
  name: string;
  code: string;
  head_employee_id: number | null;
  status: string;
}

export interface Employee {
  id: number;
  name: string;
  email: string;
  department_id: number | null;
  job_title: string | null;
  gender: string | null;
  xp_balance: number;
  points_balance: number;
  status: string;
}

/** Current user's profile including XP, points and department. */
export function useProfile() {
  return useQuery({
    queryKey: ["profile"],
    queryFn: async () => (await api.get<Profile>("/auth/me/profile")).data,
  });
}

/** All departments, used across selectors and admin views. */
export function useDepartments() {
  return useQuery({
    queryKey: ["departments"],
    queryFn: async () => (await api.get<Department[]>("/departments")).data,
  });
}

/** All employees, used in admin views and selectors. */
export function useEmployees() {
  return useQuery({
    queryKey: ["employees"],
    queryFn: async () => (await api.get<Employee[]>("/employees")).data,
  });
}

/** Map of department id to name for quick lookups in tables. */
export function useDepartmentNames() {
  const { data } = useDepartments();
  const map: Record<number, string> = {};
  (data ?? []).forEach((d) => (map[d.id] = d.name));
  return map;
}
