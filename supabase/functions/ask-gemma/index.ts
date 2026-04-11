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

// Model priority: Gemma 4 first (testing), then original order as fallback
const ALL_MODELS = [
  "gemma-4-31b-it",
  "gemma-4-26b-a4b-it",
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
  "gemini-3-flash",
  "gemma-3-27b-it",
];

// In-memory rate limit tracking — skip models that hit daily limit (RPD)
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
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setUTCHours(24, 0, 0, 0);
  rateLimitedUntil[model] = tomorrow.getTime();
}

const DB_SCHEMA = `
Database: Agricultural CRM for Adike Besaya (fertilizer company in Karnataka, India).
All timestamps are in Asia/Kolkata (IST). Currency is INR (₹).

=== SOFT-DELETE TABLES (MUST filter is_deleted = false) ===

leads (farmers/customers)
  id uuid PK, row_number int, display_id text (e.g. 'LEA-0001'),
  farmer_name text, phone text, whatsapp text, village text, taluk text, district text,
  farm_size_acres numeric, crop_type text, crop_age text, num_plants int, irrigation_type text,
  lead_source text, lead_owner text FK→users.email, created_by text FK→users.email,
  status text ('New'|'Contacted'|'Qualified'|'Not Qualified'),
  remarks text, created_date timestamptz, last_updated timestamptz,
  is_deleted bool, deleted_by text, deleted_date timestamptz, delete_reason text

field_visits (farm visits by agronomists)
  id uuid PK, row_number int, display_id text (e.g. 'VIS-0001'),
  lead_id uuid FK→leads.id, scheduled_date timestamptz, actual_date timestamptz,
  visitor_id text FK→users.email, visit_outcome text, crop_condition text,
  identified_problems text[] (array of crop disease keys), diagnosis_notes text,
  follow_up_date timestamptz, status text ('Scheduled'|'Completed'|'Cancelled'),
  visited_by text[] (array of user emails), quotation_requested bool, assigned_to text,
  created_by text FK→users.email, created_date timestamptz,
  is_deleted bool, deleted_by text, deleted_date timestamptz, delete_reason text

quotations (price quotes sent to farmers)
  id uuid PK, row_number int, display_id text (e.g. 'QUO-0001'),
  lead_id uuid FK→leads.id, visit_id uuid FK→field_visits.id (nullable),
  quote_date timestamptz, quote_amount numeric (auto-sum of line items),
  prepared_by text FK→users.email, valid_until timestamptz,
  status text ('Draft'|'Sent'|'Accepted'|'Rejected'),
  notes text, usage_instructions text,
  delivery_status text ('Pending'|'Scheduled'|'Delivered'|'Partial'), delivery_date timestamptz,
  last_updated timestamptz,
  is_deleted bool, deleted_by text, deleted_date timestamptz, delete_reason text

payments (payments against quotations)
  id uuid PK, row_number int, display_id text (e.g. 'PAY-0001'),
  quote_id uuid FK→quotations.id, payment_date timestamptz,
  payment_amount numeric (>0), payment_type text ('Advance'|'Partial'|'Final'),
  payment_method text ('Cash'|'UPI'|'Bank Transfer'), transaction_ref text,
  received_by text FK→users.email, notes text,
  is_deleted bool, deleted_by text, deleted_date timestamptz, delete_reason text

attendance (daily worker check-in/check-out & travel tracking)
  id uuid PK, row_number int, display_id text (e.g. 'ATT-0001'),
  user_email text, attendance_date date,
  check_in_time timestamptz, check_in_lat float8, check_in_lng float8, check_in_address text,
  check_out_time timestamptz, check_out_lat float8, check_out_lng float8, check_out_address text,
  km_traveled numeric(7,2), travel_notes text,
  incentive_rate numeric(6,2), incentive_amount numeric(10,2) (auto = km_traveled * incentive_rate),
  status text ('checked-in'|'checked-out'),
  created_at timestamptz, last_updated timestamptz,
  is_deleted bool, deleted_by text, deleted_date timestamptz, delete_reason text
  UNIQUE(user_email, attendance_date) — one record per worker per day

=== REGULAR TABLES (no soft delete) ===

attendance_stops (GPS stops recorded during a work day)
  id uuid PK, attendance_id uuid FK→attendance.id ON DELETE CASCADE,
  stop_order int, stop_time timestamptz,
  latitude float8, longitude float8, address text,
  km_from_previous numeric(7,2), is_manual_km bool, created_at timestamptz

attendance_config (system settings for attendance/incentives)
  id uuid PK, config_key text UNIQUE, config_value text, updated_by text, updated_at timestamptz
  Known keys: 'incentive_rate_per_km' (default '3.00')

products (product catalog)
  id uuid PK, sku text UNIQUE, name text, name_kannada text, description text,
  unit_price numeric, unit text ('kg'|'litre'|'unit'|'bag'|'bottle'|'pack'),
  category text (e.g. 'Drenching','Spraying'), dosage text,
  is_active bool, display_order int, created_at timestamptz, updated_at timestamptz

quotation_line_items (products in a quotation)
  id uuid PK, quotation_id uuid FK→quotations.id ON DELETE CASCADE,
  product_id uuid FK→products.id, product_name text, unit_price numeric,
  quantity numeric, subtotal numeric (auto = unit_price * quantity),
  notes text, display_order int, created_at timestamptz, updated_at timestamptz

users (app users / team members)
  id uuid PK, email text UNIQUE, name text,
  role text ('Field Agronomist'|'Sales Executive'|'Manager'),
  created_at timestamptz, updated_at timestamptz

allowed_users (email allowlist for app access)
  id uuid PK, email text UNIQUE, role text, invited_by text, invited_at timestamptz,
  notes text, is_active bool, can_ask_db bool

lookups (dropdown/master values for the app)
  id uuid PK, category text, value text, display_order int, active bool,
  parent_value text (e.g. Taluk's parent District)
  Categories: District, Taluk, CropType, LeadSource, LeadStatus, IrrigationType,
              VisitOutcome, VisitStatus, CropCondition, QuotationStatus, DeliveryStatus

=== KEY RELATIONSHIPS ===
leads.lead_owner / created_by → users.email
field_visits.lead_id → leads.id  |  field_visits.visitor_id / created_by → users.email
quotations.lead_id → leads.id  |  quotations.visit_id → field_visits.id  |  quotations.prepared_by → users.email
payments.quote_id → quotations.id  |  payments.received_by → users.email
quotation_line_items.quotation_id → quotations.id  |  quotation_line_items.product_id → products.id
attendance.user_email → users.email (logical, no FK)
attendance_stops.attendance_id → attendance.id
`;

const SQL_SYSTEM_PROMPT = `You are a PostgreSQL SQL expert for an agricultural CRM database.
Your ONLY job: convert the user's natural-language question into a single read-only SQL query.

${DB_SCHEMA}

=== RULES (follow strictly) ===

R1. SELECT only. Never generate INSERT, UPDATE, DELETE, DROP, ALTER, CREATE, TRUNCATE, or any DDL/DML.
R2. SOFT DELETES — Tables leads, field_visits, quotations, payments, and attendance all have is_deleted.
    You MUST add "is_deleted = false" for EVERY one of these tables that appears in FROM or JOIN.
    If you forget this, deleted records will pollute results. This is the #1 source of wrong answers.
R3. When JOINing multiple soft-delete tables, EACH table needs its own is_deleted = false condition.
R4. Show display_id (e.g. LEA-0001, VIS-0001) to humans, never the uuid id column.
R5. Format dates with TO_CHAR(col, 'DD-Mon-YYYY'). Keep amounts as raw numeric.
R6. No trailing semicolons.
R7. For "all data" / export requests, do NOT add LIMIT.
R8. Use COUNT, SUM, AVG, GROUP BY for analytical questions.
R9. For attendance queries: use attendance_date (date type) for day filtering, check_in_time/check_out_time for time math. Join attendance_stops via attendance_id for GPS stop details.
R10. If the question is unrelated to this database, set sql to null.

=== FEW-SHOT EXAMPLES ===

Q: "How many leads this month?"
A: {"sql": "SELECT COUNT(*) AS lead_count FROM leads WHERE is_deleted = false AND created_date >= DATE_TRUNC('month', CURRENT_DATE)", "needsAnswer": true}

Q: "Show all visits for farmer Ramesh"
A: {"sql": "SELECT fv.display_id, l.farmer_name, TO_CHAR(fv.actual_date, 'DD-Mon-YYYY') AS visit_date, fv.status, fv.visit_outcome FROM field_visits fv JOIN leads l ON l.id = fv.lead_id AND l.is_deleted = false WHERE fv.is_deleted = false AND l.farmer_name ILIKE '%Ramesh%' ORDER BY fv.actual_date DESC", "needsAnswer": false}

Q: "Total revenue collected by each salesman this year"
A: {"sql": "SELECT u.name, COUNT(p.id) AS payments, SUM(p.payment_amount) AS total_collected FROM payments p JOIN quotations q ON q.id = p.quote_id AND q.is_deleted = false JOIN users u ON u.email = p.received_by WHERE p.is_deleted = false AND p.payment_date >= DATE_TRUNC('year', CURRENT_DATE) GROUP BY u.name ORDER BY total_collected DESC", "needsAnswer": true}

Q: "Who has checked in today?"
A: {"sql": "SELECT a.display_id, u.name, a.user_email, TO_CHAR(a.check_in_time, 'HH12:MI AM') AS check_in, a.check_in_address, a.status FROM attendance a JOIN users u ON u.email = a.user_email WHERE a.is_deleted = false AND a.attendance_date = CURRENT_DATE ORDER BY a.check_in_time", "needsAnswer": true}

Q: "Km traveled by each person this month and their incentive"
A: {"sql": "SELECT u.name, SUM(a.km_traveled) AS total_km, SUM(a.incentive_amount) AS total_incentive, COUNT(a.id) AS days_present FROM attendance a JOIN users u ON u.email = a.user_email WHERE a.is_deleted = false AND a.attendance_date >= DATE_TRUNC('month', CURRENT_DATE) GROUP BY u.name ORDER BY total_km DESC", "needsAnswer": true}

Q: "Top 5 products by revenue"
A: {"sql": "SELECT li.product_name, SUM(li.subtotal) AS revenue, SUM(li.quantity) AS qty_sold FROM quotation_line_items li JOIN quotations q ON q.id = li.quotation_id AND q.is_deleted = false WHERE q.status IN ('Sent','Accepted') GROUP BY li.product_name ORDER BY revenue DESC LIMIT 5", "needsAnswer": true}

Q: "What's the weather today?"
A: {"sql": null, "needsAnswer": false, "message": "I can only answer questions about your CRM data — leads, visits, quotations, payments, attendance, and products. Try asking something like 'How many leads this month?' 🌱"}

=== CONVERSATION CONTEXT ===

You may receive prior turns. Use them to understand follow-ups:
- "That's wrong" / "No, I meant..." → Fix the previous SQL based on the correction.
- "Filter by..." / "But only for..." → Refine the previous query with additional WHERE conditions.
- "Show me that as a table" / "Export that" → Same query logic but set needsAnswer=false.
- "those leads" / "that data" → Refer to the entity from the previous query.

=== OUTPUT FORMAT ===

Respond with ONLY a raw JSON object. No markdown, no code fences, no explanation.
{"sql": "SELECT ...", "needsAnswer": true}
- needsAnswer=true → user wants insight/analysis (how many, who, compare, any overdue?)
- needsAnswer=false → user wants raw data/export (list all, show, export, download)
- Unrelated question → {"sql": null, "needsAnswer": false, "message": "friendly message"}

FINAL REMINDER: is_deleted = false on leads, field_visits, quotations, payments, attendance. EVERY TIME.`;

const ANSWER_SYSTEM_PROMPT = `You are a data analyst for Adike Besaya, an agricultural fertilizer company in Karnataka, India.
The user asked a question about their CRM data. You receive the SQL query results below. Your job: provide a clear, actionable answer.

=== FORMATTING ===
- **Bold** key numbers, names, and totals
- Use markdown tables for comparisons (3+ rows of structured data)
- Use bullet lists for shorter summaries
- Currency: ₹ with Indian comma system (e.g. ₹1,25,000)
- Dates: readable format (e.g. 15-Jan-2026)
- Percentages where they add insight (e.g. "Mandya: 45 leads (32% of total)")

=== TONE ===
- Concise — lead with the answer, not preamble
- Actionable — highlight what stands out, flag anomalies ("no visits in 2 weeks", "payment overdue")
- If data is empty, say clearly: "No records found for this query."
- Match the user's language (English or Kannada)
- Never include the SQL query in your answer
- For attendance data: summarize working hours, km traveled, present/absent status clearly

=== CONVERSATION ===
You may receive prior turns. Maintain continuity — refer back naturally if the user is following up.
If the user said a previous answer was wrong, acknowledge it and correct.`;

// -- Conversation history types --

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  // Attached to assistant messages for context
  sql?: string;
  data?: Record<string, unknown>[];
  rowCount?: number;
}

function buildConversationPrompt(
  messages: ChatMessage[],
  currentQuestion: string
): string {
  if (messages.length === 0) return currentQuestion;

  const contextParts: string[] = [];
  for (const msg of messages) {
    if (msg.role === "user") {
      contextParts.push(`User: ${msg.content}`);
    } else {
      // Include the SQL and summary for assistant turns so the model knows what was queried
      let assistantPart = "Assistant: ";
      if (msg.sql) assistantPart += `[Executed SQL: ${msg.sql}]`;
      if (msg.rowCount !== undefined) assistantPart += ` [${msg.rowCount} rows returned]`;
      if (msg.content) assistantPart += ` ${msg.content}`;
      contextParts.push(assistantPart);
    }
  }

  contextParts.push(`User: ${currentQuestion}`);
  return contextParts.join("\n\n");
}

function extractJSON(text: string): string {
  // 1. Try code block first
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    return codeBlockMatch[1].trim();
  }

  // 2. Try to find a JSON object that has our expected keys (sql or needsAnswer or message)
  //    Use a targeted regex to avoid grabbing the model's "thinking" text
  const targetedMatch = text.match(/\{\s*"(?:sql|needsAnswer|message)"[\s\S]*?\}(?=\s*$|\s*\n|$)/m);
  if (targetedMatch) {
    try {
      JSON.parse(targetedMatch[0]); // validate it's real JSON
      return targetedMatch[0].trim();
    } catch { /* fall through */ }
  }

  // 3. Find ALL {...} candidates and return the first one that parses as valid JSON with our keys
  const allMatches = text.match(/\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g);
  if (allMatches) {
    for (const candidate of allMatches) {
      try {
        const parsed = JSON.parse(candidate);
        if ('sql' in parsed || 'needsAnswer' in parsed || 'message' in parsed) {
          return candidate.trim();
        }
      } catch { /* try next */ }
    }
  }

  // 4. Last resort: greedy match
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

const SOFT_DELETE_TABLES = ["leads", "field_visits", "quotations", "payments", "attendance"];

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

// JSON schema for the SQL generation response — forces valid JSON from all models
const SQL_RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    sql: { type: "string", nullable: true, description: "The SQL SELECT query, or null if unrelated to DB" },
    needsAnswer: { type: "boolean", description: "true if user wants analysis, false for raw data/export" },
    message: { type: "string", nullable: true, description: "Friendly message when sql is null" },
  },
  required: ["sql", "needsAnswer"],
};

async function callGemini(
  systemPrompt: string,
  userPrompt: string,
  jsonSchema?: Record<string, unknown>
): Promise<{ text: string; model: string; thinking?: string }> {
  let lastError = "";

  for (const model of ALL_MODELS) {
    if (isRateLimited(model)) {
      console.log(`Skipping ${model} (rate-limited until midnight UTC)`);
      continue;
    }

    try {
      let body: Record<string, unknown>;

      if (isGemmaModel(model)) {
        // Gemma 4: use <|think|> for reasoning + constrained JSON output
        const thinkingPrompt = `<|think|> ${systemPrompt}`;
        body = {
          contents: [
            { parts: [{ text: `${thinkingPrompt}\n\n${userPrompt}` }] },
          ],
        };
        // Add constrained decoding for JSON output
        if (jsonSchema) {
          body.generationConfig = {
            responseMimeType: "application/json",
            responseSchema: jsonSchema,
          };
        }
      } else {
        // Gemini models: system_instruction + constrained JSON output
        body = {
          system_instruction: { parts: [{ text: systemPrompt }] },
          contents: [{ parts: [{ text: userPrompt }] }],
        };
        if (jsonSchema) {
          body.generationConfig = {
            responseMimeType: "application/json",
            responseSchema: jsonSchema,
          };
        }
      }

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

      // Extract thinking and text from response parts
      const parts = data.candidates[0].content.parts;
      let text = "";
      let thinking = "";
      for (const part of parts) {
        if (part.thought) {
          thinking += part.text || "";
        } else {
          text += part.text || "";
        }
      }

      return { text, model, thinking: thinking || undefined };
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

    const body = await req.json();
    const { question, email, messages: chatHistory } = body as {
      question: string;
      email: string;
      messages?: ChatMessage[];
    };

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

    // Build conversation-aware prompt
    const conversationPrompt = buildConversationPrompt(
      chatHistory || [],
      question.trim()
    );

    const sqlResult = await callGemini(SQL_SYSTEM_PROMPT, conversationPrompt, SQL_RESPONSE_SCHEMA);

    let sqlResponse: { sql: string | null; needsAnswer: boolean; message?: string };
    try {
      const cleanJSON = extractJSON(sqlResult.text);
      sqlResponse = JSON.parse(cleanJSON);
    } catch {
      // Model returned thinking/reasoning instead of clean JSON.
      // Try to extract the "message" value from the raw text, or use the raw text as-is.
      console.log("Failed to parse JSON, extracting message. Raw:", sqlResult.text.substring(0, 300));
      const msgMatch = sqlResult.text.match(/"message"\s*:\s*"((?:[^"\\]|\\.)*)"/);
      const fallbackMsg = msgMatch
        ? msgMatch[1].replace(/\\"/g, '"').replace(/\\n/g, '\n')
        : "Hello! I'm your Adike Besaya CRM assistant. I can help you with leads, field visits, quotations, payments, attendance, and products. Try asking something like *'How many leads this month?'*";
      return new Response(
        JSON.stringify({
          sql: null,
          rowCount: 0,
          data: [],
          answer: fallbackMsg,
          mode: "markdown",
          models: { sql: sqlResult.model, answer: null },
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
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
      // Include conversation context in answer generation too
      const historyContext = (chatHistory || [])
        .filter((m) => m.role === "user")
        .map((m) => m.content)
        .join(" → ");
      const answerPrompt = historyContext
        ? `Conversation so far: ${historyContext}\n\nLatest question: ${question}\n\nQuery returned ${rowCount} row(s):\n${JSON.stringify(rows, null, 2)}`
        : `Question: ${question}\n\nQuery returned ${rowCount} row(s):\n${JSON.stringify(rows, null, 2)}`;

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
        thinking: sqlResult.thinking || undefined,
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
