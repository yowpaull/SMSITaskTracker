import { createClient } from "@supabase/supabase-js";

const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD;
const MEMBER_EMAIL = process.env.E2E_MEMBER_EMAIL;
const MEMBER_PASSWORD = process.env.E2E_MEMBER_PASSWORD;

function fail(message: string): never {
  throw new Error(`[global-setup] ${message}`);
}

function daysFromNow(days: number) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/**
 * Runs once before the suite. A fresh project starts empty, and the specs
 * deliberately deactivate their own data when finished (create-task tears
 * down its category tree, brands ends inactive), which leaves later specs
 * without a usable create form or dashboard charts. Pin a stable baseline
 * every spec can rely on.
 */
export default async function globalSetup() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!supabaseUrl || !secretKey || secretKey.startsWith("sb_publishable_")) {
    console.warn(
      "[global-setup] SUPABASE_SECRET_KEY not available — baseline seed skipped",
    );
    return;
  }

  const authAdmin = createClient(supabaseUrl, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  }).auth.admin;

  const headers = {
    apikey: secretKey,
    Authorization: `Bearer ${secretKey}`,
    "Content-Type": "application/json",
  };

  async function restGet<T>(path: string): Promise<T[]> {
    const res = await fetch(`${supabaseUrl}/rest/v1/${path}`, { headers });
    if (!res.ok) fail(`GET ${path} → ${res.status} ${await res.text()}`);
    return (await res.json()) as T[];
  }

  async function restPost(
    table: string,
    rows: Record<string, unknown>[],
  ): Promise<{ id: string }[]> {
    const res = await fetch(`${supabaseUrl}/rest/v1/${table}`, {
      method: "POST",
      headers: { ...headers, Prefer: "return=representation" },
      body: JSON.stringify(rows),
    });
    if (!res.ok) fail(`POST ${table} → ${res.status} ${await res.text()}`);
    return (await res.json()) as { id: string }[];
  }

  async function restPatch(
    table: string,
    searchParams: string,
    values: Record<string, unknown>,
  ) {
    const res = await fetch(`${supabaseUrl}/rest/v1/${table}?${searchParams}`, {
      method: "PATCH",
      headers: { ...headers, Prefer: "return=minimal" },
      body: JSON.stringify(values),
    });
    if (!res.ok) {
      fail(`PATCH ${table}?${searchParams} → ${res.status} ${await res.text()}`);
    }
  }

  // --- Users: create missing accounts and re-pin passwords every run so
  // .env.local drift can never strand the suite at login. ---
  const existing: { id: string; email?: string }[] = [];
  for (let page = 1; ; page++) {
    const { data, error } = await authAdmin.listUsers({ page, perPage: 100 });
    if (error) fail(`listUsers: ${error.message}`);
    const users = data?.users ?? [];
    existing.push(...users);
    if (users.length < 100) break;
  }

  const ensureUser = async (email: string, password: string, fullName: string) => {
    const found = existing.find(
      (u) => u.email?.toLowerCase() === email.toLowerCase(),
    );
    if (found) {
      const { error } = await authAdmin.updateUserById(found.id, { password });
      if (error) fail(`reset password for ${email}: ${error.message}`);
      return found.id;
    }
    const { data, error } = await authAdmin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    });
    if (error || !data.user) {
      fail(`create ${email}: ${error?.message ?? "no user returned"}`);
    }
    return data.user.id;
  };

  // Admin first: the bootstrap trigger makes the very first profile an admin.
  const adminId =
    ADMIN_EMAIL && ADMIN_PASSWORD
      ? await ensureUser(ADMIN_EMAIL, ADMIN_PASSWORD, "E2E Admin")
      : null;
  const memberId =
    MEMBER_EMAIL && MEMBER_PASSWORD
      ? await ensureUser(MEMBER_EMAIL, MEMBER_PASSWORD, "E2E Member")
      : null;

  // The first-user bootstrap can land the wrong role whenever accounts are
  // created in any other order — pin both roles and display names.
  const pinProfile = async (id: string, role: string, fullName: string) => {
    const rows = await restGet(`profiles?id=eq.${id}&select=id`);
    if (rows.length !== 1) {
      fail(`profile row missing for ${id} (handle_new_user trigger did not fire?)`);
    }
    await restPatch("profiles", `id=eq.${id}`, { role, full_name: fullName });
  };
  if (adminId) await pinProfile(adminId, "admin", "E2E Admin");
  if (memberId) await pinProfile(memberId, "user", "E2E Member");

  // --- Baseline definitions: one active brand and one active
  // category → subcategory → task chain for the create form. ---
  const ensureActive = async (
    table: "brands" | "categories" | "subcategories" | "tasks",
    match: Record<string, string>,
    insert: Record<string, unknown>,
  ) => {
    const where = Object.entries(match)
      .map(([key, value]) => `${key}=eq.${encodeURIComponent(value)}`)
      .join("&");
    const rows = await restGet<{ id: string; is_active: boolean }>(
      `${table}?${where}&select=id,is_active`,
    );
    if (rows.length === 0) {
      const [created] = await restPost(table, [insert]);
      return created.id;
    }
    const row = rows[0];
    if (!row.is_active) await restPatch(table, `id=eq.${row.id}`, { is_active: true });
    return row.id;
  };

  const brandId = await ensureActive(
    "brands",
    { name: "E2E Base Brand" },
    { name: "E2E Base Brand" },
  );
  const categoryId = await ensureActive(
    "categories",
    { name: "E2E Base Category" },
    { name: "E2E Base Category" },
  );
  const subcategoryId = await ensureActive(
    "subcategories",
    { category_id: categoryId, name: "E2E Base Subcategory" },
    { category_id: categoryId, name: "E2E Base Subcategory" },
  );
  const taskId = await ensureActive(
    "tasks",
    { name: "E2E Base Task" },
    { name: "E2E Base Task", subcategory_id: subcategoryId },
  );

  // --- Baseline logs: a few rows across statuses so the dashboard renders
  // pie/progress/recent sections from the very first test. ---
  if (adminId && memberId) {
    const logs = await restGet<{ id: string }>(
      `task_logs?task_id=eq.${taskId}&select=id`,
    );
    // Uniform keys: PostgREST rejects bulk inserts with differing columns.
    const templates = [
      {
        assigned_to: adminId,
        status: "completed",
        deadline: daysFromNow(2),
        completed_at: new Date().toISOString(),
        important: true,
        urgent: false,
      },
      {
        assigned_to: adminId,
        status: "in_progress",
        deadline: daysFromNow(5),
        completed_at: null,
        important: false,
        urgent: true,
      },
      {
        assigned_to: memberId,
        status: "pending",
        deadline: daysFromNow(3),
        completed_at: null,
        important: false,
        urgent: false,
      },
    ];
    // One more than TASK_LOG_PAGE_SIZE (25) so the pagination test has a
    // second page on a fresh database.
    const targetLogs = 26;
    const rows: Record<string, unknown>[] = [];
    for (let i = logs.length; i < targetLogs; i++) {
      rows.push({
        ...templates[i % templates.length],
        task_id: taskId,
        brand_id: brandId,
        created_by: adminId,
      });
    }
    if (rows.length > 0) await restPost("task_logs", rows);
  }

  console.log("[global-setup] baseline ready");
}
