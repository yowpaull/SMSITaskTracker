import type { TaskStatus } from "@/lib/status";

export type Profile = {
  id: string;
  full_name: string;
  email: string;
  role: "admin" | "user";
  created_at: string;
  updated_at: string;
};

export type Brand = {
  id: string;
  name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type Category = {
  id: string;
  name: string;
  short_description: string | null;
  is_active: boolean;
  parent_id: string | null;
  created_at: string;
  updated_at: string;
};

export type TaskDefinition = {
  id: string;
  name: string;
  category_id: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type TaskLog = {
  id: string;
  task_id: string;
  brand_id: string;
  assigned_to: string;
  created_by: string;
  status: TaskStatus;
  urgent: boolean;
  important: boolean;
  completed_at: string | null;
  deadline: string | null;
  created_at: string;
  updated_at: string;
};

export type TaskLogWithRelations = TaskLog & {
  task: {
    id: string;
    name: string;
    category_id: string;
    category: {
      id: string;
      name: string;
      parent_id: string | null;
      parent: { id: string; name: string } | null;
    } | null;
  } | null;
  brand: { id: string; name: string } | null;
  assignee: { id: string; full_name: string; email: string } | null;
};

export type TaskLogFilters = {
  status?: TaskStatus;
  brandId?: string;
  categoryId?: string;
  assignedTo?: string;
  q?: string;
  from?: string;
  to?: string;
};

export type TaskOption = { label: string; value: string };

/** Main category with its subcategories and tasks, for the task-log cascade. */
export type TaskPickGroup = {
  mainCategoryId: string;
  mainCategoryName: string;
  subcategories: { id: string; name: string }[];
  directTasks: TaskOption[];
  tasksBySubcategory: Record<string, TaskOption[]>;
};
