
# Evaluation API Test Plan

Use these steps to validate the `/api/evaluate` endpoint.

## Prerequisites
1. **Server Running**: Ensure your Next.js dev server is running (`npm run dev`).
2. **Database Running**: Ensure Supabase is active.
3. **Valid Session**: You need at least one completed session with a transcript in the `sessions` table.

---

## Test Scenario 1: Starter Tier (Strict Restriction)

**Objective**: Verify that a Starter user receives ONLY the 4 scores, key insight, and improvement priorities. All Pro/Pro+ fields must be NULL.

### Steps:
1.  **Set User Tier**:
    In your Supabase dashboard (Table: `users`), find your test user and set `package_tier` to `"Starter"`.
2.  **Identify Session**:
    Find a `session_id` for this user that has a `transcript`.
3.  **Trigger Evaluation**:
    Send a POST request to `/api/evaluate`:
    ```bash
    curl -X POST http://localhost:3000/api/evaluate \
      -H "Content-Type: application/json" \
      -H "Cookie: optional_auth_cookie_if_needed" \
      -d '{"session_id": "YOUR_SESSION_ID"}'
    ```
    *(Note: You might need to trigger this via the UI's "End Session" button if auth is strict and hard to `curl`).*

### Verification:
-   [ ] **Status**: 200 OK.
-   [ ] **JSON Response**:
    -   `clarity`, `structure`, `recovery`, `signal_noise` are 0-100.
    -   `key_insight` is a string.
    -   `improvement_priorities` is an array of 3 strings.
    -   **CRITICAL**: `alternative_approaches` MUST be `null`.
    -   **CRITICAL**: `pattern_analysis`, `risk_projection`, `readiness_assessment`, `framework_contrast` MUST be `null`.

---

## Test Scenario 2: Pro Tier (Partial Unlocking)

**Objective**: Verify that a Pro user receives `alternative_approaches` but NO Pro+ fields.

### Steps:
1.  **Set User Tier**:
    Update user `package_tier` to `"Pro"` in Supabase.
2.  **Trigger Evaluation**:
    Call the API again for the same (or different) session.

### Verification:
-   [ ] **JSON Response**:
    -   `alternative_approaches` IS populated (string or array).
    -   **CRITICAL**: `pattern_analysis` MUST be `null`.
    -   **CRITICAL**: `readiness_assessment` MUST be `null`.

---

## Test Scenario 3: Pro+ Tier (Full Unlocking)

**Objective**: Verify that a Pro+ user receives ALL analysis fields.

### Steps:
1.  **Set User Tier**:
    Update user `package_tier` to `"Pro+"` in Supabase.
2.  **Trigger Evaluation**:
    Call the API.

### Verification:
-   [ ] **JSON Response**:
    -   `pattern_analysis` IS populated.
    -   `risk_projection` IS populated.
    -   `readiness_assessment` IS populated ("Not ready", "Borderline", or "Interview-ready").
    -   `framework_contrast` IS populated.

---

## Test Scenario 4: JSON Guard & Data Integrity

**Objective**: Ensure invalid JSON does not corrupt the database.

### Internal Verification (Log Check):
1.  If OpenAI were to return valid text but invalid JSON (rare with `json_object` mode), the backend logs should show:
    `Evaluation JSON parse failed`.
2.  The `sessions` table should **NOT** be updated. The old values (or nulls) should remain.

### Database Persistence Check:
1.  After a successful test (e.g., Test Scenario 3), check the `sessions` table in Supabase.
2.  Verify the columns `clarity`, `pattern_analysis`, etc., match the JSON response you received.
