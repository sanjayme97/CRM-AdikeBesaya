import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

// Gemini first (better quality), Gemma as fallback (higher quota)
const ALL_MODELS = [
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
  "gemini-3-flash",
  "gemma-3-27b-it",
];

// In-memory rate limit tracking — skip models that hit daily limit (RPD)
// Persists across requests within the same Edge Function isolate
const rateLimitedUntil: Record<string, number> = {};

function isRateLimited(model: string): boolean {
  const until = rateLimitedUntil[model];
  if (!until) return false;
  if (Date.now() > until) {
    delete rateLimitedUntil[model];
    return false;
  }
  return true;
}

function markRateLimited(model: string): void {
  // RPD limits reset daily — skip until end of day (midnight UTC)
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setUTCHours(24, 0, 0, 0);
  rateLimitedUntil[model] = tomorrow.getTime();
}

const DB_SCHEMA = `
Database: Agricultural CRM for Adike Besaya (fertilizer company in Karnataka, India)

Tables:

1. leads (farmers/customers) — HAS is_deleted
   id (uuid PK), display_id (text, e.g. LEA-0001), farmer_name, phone, whatsapp, village, taluk, district, farm_size_acres (numeric), crop_type, crop_age, num_plants (int), irrigation_type, lead_source, lead_owner (FK -> users.email), status (New/Contacted/Qualified/Not Qualified), remarks, created_date (timestamptz), last_updated, is_deleted (bool), deleted_by, deleted_date, delete_reason

2. field_visits (farm visits by agronomists) — HAS is_deleted
   id (uuid PK), display_id (e.g. VIS-0001), lead_id (FK -> leads.id), scheduled_date, actual_date, visitor_id (FK -> users.email), visit_outcome, crop_condition, diagnosis_notes, follow_up_date, status (Scheduled/Completed/Cancelled), visited_by (text[]), quotation_requested (bool), assigned_to, created_by (FK -> users.email), created_date, is_deleted, deleted_by, deleted_date, delete_reason, identified_problems (text[])

3. quotations (price quotes) — HAS is_deleted
   id (uuid PK), display_id (e.g. QUO-0001), lead_id (FK -> leads.id), visit_id (FK -> field_visits.id), quote_date, quote_amount (numeric), prepared_by (FK -> users.email), valid_until, status (Draft/Sent/Accepted/Rejected), notes, delivery_status (Pending/Scheduled/Delivered/Partial), delivery_date, last_updated, is_deleted, deleted_by, deleted_date, delete_reason, usage_instructions

4. payments — HAS is_deleted
   id (uuid PK), display_id (e.g. PAY-0001), quote_id (FK -> quotations.id), payment_date, payment_amount (numeric), payment_type (Advance/Partial/Final), payment_method (Cash/UPI/Bank Transfer), transaction_ref, received_by (FK -> users.email), notes, is_deleted, deleted_by, deleted_date, delete_reason

5. products (product catalog)
   id (uuid PK), sku, name, name_kannada, description, unit_price (numeric), unit, category, is_active (bool), display_order (int), dosage

6. quotation_line_items
   id (uuid PK), quotation_id (FK -> quotations.id), product_id (FK -> products.id), product_name, unit_price (numeric), quantity (numeric), subtotal (numeric, auto-generated), notes, display_order (int)

7. users (app users)
   id (uuid PK), email, name, role (Field Agronomist/Sales Executive/Manager)

8. lookups (dropdown values)
   id (uuid PK), category, value, display_order (int), active (bool), parent_value

Key relationships:
- leads.lead_owner -> users.email
- field_visits.lead_id -> leads.id
- field_visits.visitor_id -> users.email
- quotations.lead_id -> leads.id
- quotations.visit_id -> field_visits.id
- quotations.prepared_by -> users.email
- payments.quote_id -> quotations.id
- payments.received_by -> users.email
- quotation_line_items.quotation_id -> quotations.id
- quotation_line_items.product_id -> products.id
`;

const SQL_SYSTEM_PROMPT = `You are a PostgreSQL SQL expert for an agricultural CRM database (Adike Besaya - fertilizer company in Karnataka, India).

Your job: convert natural language questions into SQL queries.

Database schema:
${DB_SCHEMA}

Rules:
1. ONLY generate SELECT queries. Never INSERT, UPDATE, DELETE, DROP, ALTER, TRUNCATE.
2. CRITICAL — SOFT DELETE FILTER: The tables leads, field_visits, quotations, and payments use soft deletes. You MUST ALWAYS include "is_deleted = false" in the WHERE clause for these tables. NEVER forget this. Example:
   Question: "How many leads today?"
   Correct: SELECT COUNT(*) FROM leads WHERE is_deleted = false AND created_date >= CURRENT_DATE
   WRONG:   SELECT COUNT(*) FROM leads WHERE created_date >= CURRENT_DATE
3. Use proper JOINs when data from multiple tables is needed. Add is_deleted = false for EACH joined soft-delete table.
4. Use display_id (e.g. LEA-0001) instead of uuid id when showing records.
5. Format dates using TO_CHAR(column, 'DD-Mon-YYYY') for readability.
6. For amounts, keep as numeric (don't format in SQL).
7. When the user asks for "all" data or exports, do NOT add LIMIT.
8. For analytical/summary questions, use COUNT, SUM, AVG, GROUP BY as appropriate.
9. Do NOT add a semicolon at the end of the SQL query.
10. If the question is UNRELATED to the database (e.g. weather, jokes, general knowledge, greetings), set sql to null and provide a friendly message.

You MUST respond with ONLY a JSON object, no other text, no markdown code blocks:
{"sql": "SELECT ...", "needsAnswer": true}

- Set needsAnswer to true if the user wants an insight, answer, or analysis (e.g. "how many", "who is top", "compare", "any overdue?").
- Set needsAnswer to false if the user wants raw data or an export (e.g. "list all", "show all", "export", "download", "get all leads").
- If the question is unrelated to the database, respond with: {"sql": null, "needsAnswer": false, "message": "your friendly message here"}

REMINDER: Always include is_deleted = false for leads, field_visits, quotations, payments.`;

const ANSWER_SYSTEM_PROMPT = `You are a helpful data analyst for Adike Besaya, an agricultural fertilizer company in Karnataka, India.

The user asked a question about their CRM data. You have the query results below. Provide a clear, well-formatted answer in Markdown.

Formatting rules:
- Use **bold** for key numbers and names
- Use tables (markdown) for tabular comparisons
- Use bullet lists for lists
- Use rupee symbol for monetary amounts and format with Indian comma system (e.g. 1,25,000)
- Format dates in readable format (e.g. 15-Jan-2026)
- Keep it concise and actionable
- If data is empty, say so clearly
- Do NOT include the SQL query in your answer
- Answer in the same language the user asked in (English or Kannada)`;

function extractJSON(text: string): string {
  const codeBlockMatch = text.match(/\`\`\`(?:json)?\s*([\s\S]*?)\`\`\`/);
  if (codeBlockMatch) {
    return codeBlockMatch[1].trim();
  }
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    return jsonMatch[0].trim();
  }
  return text.trim();
}

function cleanSQL(sql: string): string {
  return sql.trim().replace(/;+\s*$/, "").trim();
}

function isGemmaModel(model: string): boolean {
  return model.startsWith("gemma");
}

const SOFT_DELETE_TABLES = ["leads", "field_visits", "quotations", "payments"];

function ensureSoftDeleteFilter(sql: string): string {
  const sqlLower = sql.toLowerCase();

  if (sqlLower.includes("is_deleted")) return sql;

  const hasSDTable = SOFT_DELETE_TABLES.some((t) =>
    new RegExp(`\\b${t}\\b`, "i").test(sql)
  );
  if (!hasSDTable) return sql;

  const whereIdx = sqlLower.indexOf("where");
  if (whereIdx !== -1) {
    const before = sql.substring(0, whereIdx + 5);
    const after = sql.substring(whereIdx + 5);
    return `${before} is_deleted = false AND${after}`;
  }

  const match = sql.match(/\b(GROUP\s+BY|ORDER\s+BY|LIMIT|HAVING)\b/i);
  if (match && match.index !== undefined) {
    const before = sql.substring(0, match.index);
    const after = sql.substring(match.index);
    return `${before}WHERE is_deleted = false ${after}`;
  }

  return `${sql} WHERE is_deleted = false`;
}

async function callGemini(
  systemPrompt: string,
  userPrompt: string
): Promise<{ text: string; model: string }> {
  let lastError = "";

  for (const model of ALL_MODELS) {
    // Skip models that hit their daily limit
    if (isRateLimited(model)) {
      console.log(`Skipping ${model} (rate-limited until midnight UTC)`);
      continue;
    }

    try {
      const body: Record<string, unknown> = isGemmaModel(model)
        ? {
            contents: [
              { parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] },
            ],
          }
        : {
            system_instruction: { parts: [{ text: systemPrompt }] },
            contents: [{ parts: [{ text: userPrompt }] }],
          };

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      );

      if (response.status === 429) {
        console.log(`Model ${model} hit daily limit, skipping until midnight...`);
        markRateLimited(model);
        lastError = `${model}: rate limited`;
        continue;
      }

      if (!response.ok) {
        const errorText = await response.text();
        console.log(`Model ${model} error ${response.status}, trying next...`);
        lastError = `${model}: ${response.status} - ${errorText}`;
        continue;
      }

      const data = await response.json();

      if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
        console.log(`Model ${model} returned no content, trying next...`);
        lastError = `${model}: no content in response`;
        continue;
      }

      return {
        text: data.candidates[0].content.parts[0].text,
        model,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.log(`Model ${model} failed: ${msg}, trying next...`);
      lastError = `${model}: ${msg}`;
      continue;
    }
  }

  throw new Error(`All models failed. Last error: ${lastError}`);
}

function validateSQL(sql: string): boolean {
  const trimmed = sql.trim().toLowerCase();

  if (!trimmed.startsWith("select") && !trimmed.startsWith("with")) {
    return false;
  }

  if (sql.includes(";")) {
    return false;
  }

  return true;
}

async function validateUser(
  supabase: ReturnType<typeof createClient>,
  email: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from("allowed_users")
    .select("can_ask_db")
    .eq("email", email)
    .eq("is_active", true)
    .single();

  if (error || !data) return false;
  return data.can_ask_db === true;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is not configured");
    }

    const { question, email } = await req.json();

    if (!email || typeof email !== "string") {
      return new Response(
        JSON.stringify({ error: "User email is required" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const hasAccess = await validateUser(supabase, email);

    if (!hasAccess) {
      return new Response(
        JSON.stringify({ error: "You don't have access to this feature" }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (
      !question ||
      typeof question !== "string" ||
      question.trim().length === 0
    ) {
      return new Response(
        JSON.stringify({ error: "Question is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const sqlResult = await callGemini(SQL_SYSTEM_PROMPT, question.trim());

    let sqlResponse: { sql: string | null; needsAnswer: boolean; message?: string };
    try {
      const cleanJSON = extractJSON(sqlResult.text);
      sqlResponse = JSON.parse(cleanJSON);
    } catch {
      throw new Error("Failed to parse AI response: " + sqlResult.text);
    }

    if (!sqlResponse.sql) {
      const msg = sqlResponse.message || "I can only answer questions about your CRM data. Try asking about leads, visits, quotations, or payments!";
      return new Response(
        JSON.stringify({
          sql: null,
          rowCount: 0,
          data: [],
          answer: msg,
          mode: "markdown",
          models: { sql: sqlResult.model, answer: null },
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    let sql = cleanSQL(sqlResponse.sql);
    const { needsAnswer } = sqlResponse;

    if (!validateSQL(sql)) {
      return new Response(
        JSON.stringify({
          error: "Generated query is not a valid SELECT statement",
          sql,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    sql = ensureSoftDeleteFilter(sql);

    const { data, error } = await supabase.rpc("ask_database", {
      query_text: sql,
    });

    if (error) {
      throw new Error(`SQL execution error: ${error.message}`);
    }

    const rows = data || [];
    const rowCount = Array.isArray(rows) ? rows.length : 0;

    let answer: string | null = null;
    let mode: "markdown" | "table" = "table";
    let answerModel: string | null = null;

    if (needsAnswer && rowCount <= 100) {
      const answerPrompt = `Question: ${question}\n\nQuery returned ${rowCount} row(s):\n${JSON.stringify(rows, null, 2)}`;
      const answerResult = await callGemini(
        ANSWER_SYSTEM_PROMPT,
        answerPrompt
      );
      answer = answerResult.text;
      answerModel = answerResult.model;
      mode = "markdown";
    }

    return new Response(
      JSON.stringify({
        sql,
        rowCount,
        data: rows,
        answer,
        mode,
        models: {
          sql: sqlResult.model,
          answer: answerModel,
        },
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("ask-database error:", message);

    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
