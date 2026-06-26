# Bill Spill v2 — Feature Expansion PRD

## Context & Baseline

Bill Spill is a Next.js (App Router) + Supabase + Tailwind CSS bill-splitting web app. The codebase lives at `github.com/anushkasrivastava21/bill-spill`.

### Existing Stack
- **Frontend:** React, Next.js (App Router), Tailwind CSS, `next/font` (Geist)
- **Backend/DB:** Supabase (Auth, PostgreSQL, Row Level Security)
- **Hosting:** Vercel (auto-deploy on merge to main)

### Existing Database Tables
| Table | Purpose | Key Columns |
|---|---|---|
| `users` | User accounts | `id` (PK, UUID from Supabase Auth), `email`, `name`, `date_joined` |
| `personal_expenses` | Private spending | `id`, `user_id` (FK→users), `description`, `amount`, `category`, `date` |
| `shared_groups` | Group containers | `id`, `name`, `created_by` (FK→users), `date_created` |
| `group_members` | Group membership | `id`, `group_id` (FK→shared_groups), `user_id` (FK→users) |
| `group_expenses` | Group bills | `id`, `group_id` (FK→shared_groups), `paid_by_user` (FK→users), `amount`, `description`, `date` |

### Existing RLS Policies
- `is_group_member(check_group_id uuid)` — a `SECURITY DEFINER` helper function that checks if `auth.uid()` is in `group_members` for a given group.
- Personal expenses: only visible to the owning `user_id`.
- Group data (groups, members, expenses): only visible/insertable if you pass the `is_group_member` check.
- Group member insertion: allowed if you are the group creator OR you are adding yourself.

### Existing UI Pages
| Route | What it does |
|---|---|
| `/login` | Email + password sign-in |
| `/signup` | Name + email + password registration |
| `/dashboard` | Layout wrapper with sidebar (My Expenses, Shared Groups, Logout) |
| `/dashboard/expenses` | Personal expenses: 4 stat cards, add-expense form, paginated history table |
| `/dashboard/groups` | Group list as cards, create-group form |
| `/dashboard/groups/[id]` | Group detail: member list, add-member, add-expense, "who owes who" calculation |

### Existing Personal Expense Categories
The app already uses a category dropdown on personal expenses with values like: Food, Transport, Bills, Entertainment, Shopping, Health, Other.

---

## FEATURE 1: Receipt Photo Upload

### What
Let users optionally attach a photo of a receipt when adding a personal expense OR a group expense. The image is stored in Supabase Storage and linked to the expense row. Users can tap on any expense in the history list to view the attached receipt.

### Why
Settles disputes in groups ("I definitely paid ₹600 for firewood, here's the receipt"). Also helps individuals keep proof for personal budgeting.

### Database Changes

**Supabase Storage:**
- Create a new storage bucket called `receipts`.
- Bucket policy: authenticated users can upload. Users can only read files they uploaded OR files attached to expenses in groups they belong to.
- File path convention: `receipts/{user_id}/{expense_type}_{expense_id}.{ext}` where `expense_type` is `personal` or `group`.
- Max file size: 5 MB. Accepted MIME types: `image/jpeg`, `image/png`, `image/webp`.

**Schema changes:**
```sql
-- Add receipt URL column to both expense tables
ALTER TABLE personal_expenses ADD COLUMN receipt_url TEXT DEFAULT NULL;
ALTER TABLE group_expenses ADD COLUMN receipt_url TEXT DEFAULT NULL;
```

No new RLS policies needed — the URL is just a text column. The storage bucket itself has its own access policies.

### Storage Bucket RLS Policies
```sql
-- Users can upload to their own folder
CREATE POLICY "Users can upload receipts" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'receipts'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Users can view their own receipts
CREATE POLICY "Users can view own receipts" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'receipts'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Users can view group receipts if they are a member
-- (Group receipts are identified by the 'group_' prefix in filename)
CREATE POLICY "Users can view group receipts" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'receipts'
    AND EXISTS (
      SELECT 1 FROM group_expenses ge
      JOIN group_members gm ON gm.group_id = ge.group_id
      WHERE ge.receipt_url = storage.filename(name)
        AND gm.user_id = auth.uid()
    )
  );
```

### UI Changes

**Personal expense form (`/dashboard/expenses`):**
- Add a camera/upload icon button next to the "Add" button in the expense entry form.
- Clicking it opens the device file picker (accept `image/*`). On mobile, this should offer the camera option natively.
- Show a small thumbnail preview (48×48px, rounded corners) next to the form after selecting an image.
- The image is uploaded to Supabase Storage immediately after the expense is saved. Show a brief upload spinner on the thumbnail.

**Group expense form (`/dashboard/groups/[id]`):**
- Same camera/upload icon added to the group expense entry form.
- Same thumbnail preview behavior.

**Expense history rows (both personal and group):**
- If `receipt_url` is not null, show a small 📎 paperclip icon next to the expense description.
- Clicking the icon (or the row) opens a modal/lightbox overlay showing the full receipt image with a close button.
- Modal should have a dark semi-transparent backdrop and the image should be max 90% viewport width/height, centered.

### Upload Flow (Implementation Detail)
1. User fills out expense form and selects an image.
2. User clicks "Save Expense" / "Submit".
3. Frontend inserts the expense row into `personal_expenses` or `group_expenses` (without `receipt_url`).
4. Frontend uploads the image to Supabase Storage at `receipts/{user_id}/{type}_{expense_id}.{ext}`.
5. Frontend gets the public URL back from Supabase Storage.
6. Frontend updates the expense row with the `receipt_url`.
7. If upload fails, the expense still saves (receipt is optional). Show a toast: "Expense saved but receipt upload failed. Try again later."

### Error States
- File too large (>5 MB): Red toast — "Receipt must be under 5 MB."
- Wrong file type: Red toast — "Please upload an image (JPEG, PNG, or WebP)."
- Upload fails mid-way: Expense still saves, show warning toast.

---

## FEATURE 2: Expense Categories for Group Bills

### What
Add the same category system that exists on personal expenses to group expenses. Show a per-category spending breakdown inside each group.

### Why
When a trip ends, users want to know "we spent ₹8,000 on food and ₹12,000 on transport" — not just a lump total.

### Database Changes
```sql
ALTER TABLE group_expenses ADD COLUMN category TEXT DEFAULT 'Other';
```

Use the same category values as personal expenses: Food, Transport, Bills, Entertainment, Shopping, Health, Other. This keeps the UX consistent.

### UI Changes

**Group expense form (`/dashboard/groups/[id]`):**
- Add a "Category" dropdown (same styling as the personal expense form) between the "Amount" and "Submit" fields.
- Default selection: "Other".

**Group expense list:**
- Show a colored category badge next to each expense row, same style as personal expenses (e.g., orange badge for Food, blue for Transport).

**New: Category breakdown panel (inside group detail page):**
- Add a new section below the "Who Owes Who" section titled "Spending Breakdown".
- Display a horizontal stacked bar or a simple list showing each category's total and percentage of the group's total spend.
- Example rendering:
  ```
  Food         ₹8,200   (41%)  ██████████░░░░░░░░░░
  Transport    ₹6,400   (32%)  ████████░░░░░░░░░░░░
  Stay         ₹3,800   (19%)  █████░░░░░░░░░░░░░░░
  Other        ₹1,600   ( 8%)  ██░░░░░░░░░░░░░░░░░░
  ```
- This is computed client-side from the existing `group_expenses` query — no new database queries or views needed. Just group-by on the `category` column.

### Migration Note
Existing group expenses (created before this feature) will have `category = 'Other'` by default, which is correct.

---

## FEATURE 3: Settlement History

### What
Add a `settlements` table to record when one group member pays another member back. Settlements reduce the "Who Owes Who" balances and are displayed in a history log.

### Why
Currently debts just exist with no record of repayment. There is no "Settle Up" action at all. Users need to record payments to clear debts, and there needs to be a paper trail showing who paid whom and when.

### Database Changes
```sql
CREATE TABLE settlements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES shared_groups(id) ON DELETE CASCADE,
  payer_id UUID NOT NULL REFERENCES users(id),      -- the person who pays money
  payee_id UUID NOT NULL REFERENCES users(id),      -- the person who receives money
  amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
  note TEXT DEFAULT NULL,                            -- optional note like "UPI transfer"
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS: same membership check as group_expenses
ALTER TABLE settlements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view settlements" ON settlements
  FOR SELECT USING (public.is_group_member(group_id));

CREATE POLICY "Users can insert settlements" ON settlements
  FOR INSERT WITH CHECK (
    public.is_group_member(group_id)
    AND payer_id = auth.uid()  -- only the payer can record their own payment
  );

CREATE POLICY "Users can delete own settlements" ON settlements
  FOR DELETE USING (
    payer_id = auth.uid()
    AND created_at > NOW() - INTERVAL '24 hours'  -- can only undo within 24h
  );
```

### How Settlements Affect the "Who Owes Who" Algorithm
The existing minimum-transactions algorithm computes net balances from `group_expenses`. Now it must also subtract settlements:

```
net_balance[user] = (total paid by user across all group expenses)
                  - (user's fair share of all group expenses)
                  - (total settlements user has PAID in this group)
                  + (total settlements user has RECEIVED in this group)
```

Then run the same min-transactions algorithm on the adjusted net balances. If all net balances are zero (or within ±₹1 rounding), show: "✓ All debts in this group are settled!"

### UI Changes

**Group detail page (`/dashboard/groups/[id]`) — "Settle Up" button:**
- Add a "Settle Up" button next to each debt line in the "Who Owes Who" section.
- Example: If the display shows "Kabir owes Aisha ₹1,200", there is a green "Settle Up" button at the end of that row.
- Clicking "Settle Up" opens a small inline form or modal:
  - Pre-filled: Payer = Kabir, Payee = Aisha, Amount = ₹1,200 (editable, for partial payments).
  - Optional text field: "Note" (placeholder: "UPI / cash / bank transfer").
  - "Confirm Settlement" button (with loading state).
- On success: green toast "✓ Settlement recorded!", debt recalculates instantly.

**Settlement History section (below "Who Owes Who"):**
- Title: "Settlement History"
- Chronological list (newest first) showing:
  - "Kabir paid Aisha ₹1,200 · UPI transfer · 2 hours ago"
  - Each row has a small red "Undo" link if the settlement is less than 24 hours old AND was created by the current user.
- If no settlements exist yet, show light gray text: "No settlements recorded yet."

### User Flow
1. User views the group detail page and sees "Kabir owes Aisha ₹1,200".
2. User clicks "Settle Up" next to that line.
3. Modal opens with amount pre-filled to ₹1,200.
4. User optionally changes amount to ₹600 (partial settlement), adds note "Paid half via GPay".
5. User clicks "Confirm Settlement".
6. Row inserted into `settlements` table.
7. "Who Owes Who" recalculates: now shows "Kabir owes Aisha ₹600".
8. Settlement appears in history: "Kabir paid Aisha ₹600 · Paid half via GPay · just now".

### Error States
- Amount <= 0: "Please enter a valid amount."
- Amount > outstanding debt: "Settlement amount cannot exceed the debt of ₹X."
- Trying to settle with yourself: prevent by hiding the "Settle Up" button on zero-debt lines.

---

## FEATURE 4: Currency Formatting Toggle

### What
Let group creators pick a currency when creating a group. All amounts within that group display with the chosen currency symbol. Personal expenses always use the user's default currency (₹ for now).

### Why
Friend groups that travel internationally need to track expenses in the local currency (e.g., a Thailand trip uses ฿, a Europe trip uses €).

### Database Changes
```sql
ALTER TABLE shared_groups ADD COLUMN currency TEXT DEFAULT 'INR';
```

### Supported Currencies (Phase 1)
| Code | Symbol | Name |
|---|---|---|
| INR | ₹ | Indian Rupee |
| USD | $ | US Dollar |
| EUR | € | Euro |
| GBP | £ | British Pound |
| THB | ฿ | Thai Baht |
| AED | د.إ | UAE Dirham |
| SGD | S$ | Singapore Dollar |
| JPY | ¥ | Japanese Yen |

### UI Changes

**Create group form (`/dashboard/groups`):**
- Add a "Currency" dropdown next to the "Group Name" input field.
- Default: INR (₹).
- Dropdown shows: "₹ INR", "$ USD", "€ EUR", etc.

**Group detail page:**
- All amount displays (expense list, "Who Owes Who" balances, settlement amounts) use the group's currency symbol instead of hardcoded ₹.
- The stat cards or summary totals within the group also use the group currency.

**Group card on the groups list page (`/dashboard/groups`):**
- The "You are owed ₹1,400" / "You owe ₹600" text uses the group's currency.

**Implementation detail — create a utility function:**
```javascript
// src/utils/currency.js
const CURRENCIES = {
  INR: { symbol: '₹', locale: 'en-IN' },
  USD: { symbol: '$', locale: 'en-US' },
  EUR: { symbol: '€', locale: 'de-DE' },
  GBP: { symbol: '£', locale: 'en-GB' },
  THB: { symbol: '฿', locale: 'th-TH' },
  AED: { symbol: 'د.إ', locale: 'ar-AE' },
  SGD: { symbol: 'S$', locale: 'en-SG' },
  JPY: { symbol: '¥', locale: 'ja-JP' },
};

export function formatAmount(amount, currencyCode = 'INR') {
  const { locale } = CURRENCIES[currencyCode] || CURRENCIES.INR;
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currencyCode,
    minimumFractionDigits: currencyCode === 'JPY' ? 0 : 2,
  }).format(amount);
}
```

Replace all hardcoded `₹${amount}` strings throughout the codebase with calls to `formatAmount(amount, group.currency)` for group contexts, and `formatAmount(amount, 'INR')` for personal expenses.

### Note on Currency Conversion
This feature is display-only — it does NOT convert between currencies. A "Thailand Trip" group in THB means all expenses are entered and displayed in Thai Baht. The app does not fetch exchange rates. This keeps it simple and avoids financial API dependencies.

---

## FEATURE 5: Unequal Splits

### What
Allow group expenses to be split unequally. When adding a group expense, the user can choose between three split modes: Equal (default, current behavior), Percentage-based, or Exact amounts per member. Users can also exclude specific members from a particular expense.

### Why
Aisha's use case from the PRD: some friends joined the trip late and shouldn't pay for the first night's hotel. Flatmates may split rent unequally based on room size. A dinner where one person ordered alcohol and others didn't should let you assign custom amounts.

### Database Changes

**New table to store per-member split info:**
```sql
CREATE TABLE expense_splits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  expense_id UUID NOT NULL REFERENCES group_expenses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  amount DECIMAL(12,2) NOT NULL,  -- the actual amount this user owes for this expense
  UNIQUE(expense_id, user_id)     -- one split record per user per expense
);

ALTER TABLE expense_splits ENABLE ROW LEVEL SECURITY;

-- RLS: visible if you can see the parent expense
CREATE POLICY "Users can view splits" ON expense_splits
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM group_expenses ge
      WHERE ge.id = expense_id
        AND public.is_group_member(ge.group_id)
    )
  );

CREATE POLICY "Users can insert splits" ON expense_splits
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM group_expenses ge
      WHERE ge.id = expense_id
        AND public.is_group_member(ge.group_id)
    )
  );

CREATE POLICY "Users can delete splits" ON expense_splits
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM group_expenses ge
      WHERE ge.id = expense_id
        AND ge.paid_by_user = auth.uid()
    )
  );
```

**Add split_type to group_expenses:**
```sql
ALTER TABLE group_expenses ADD COLUMN split_type TEXT DEFAULT 'equal'
  CHECK (split_type IN ('equal', 'percentage', 'exact'));
```

### How Splits Work

**Equal (default, backward compatible):**
- No rows in `expense_splits`. The "Who Owes Who" algorithm divides by member count as it does today.
- If specific members are excluded, `expense_splits` rows ARE created for the included members only, each with `amount = total / included_count`.

**Percentage:**
- User assigns a percentage to each member. Percentages must sum to 100%.
- `expense_splits` rows are created with `amount = total × (percentage / 100)`.

**Exact:**
- User assigns an exact ₹ amount to each member. Amounts must sum to the expense total.
- `expense_splits` rows are created with those exact amounts.

### Updated "Who Owes Who" Algorithm
```
For each expense in group:
  if expense has rows in expense_splits:
    each user's share = their expense_splits.amount
  else:
    each user's share = expense.amount / member_count  (old equal behavior)

net_balance[user] = sum(expenses where user paid) - sum(user's shares across all expenses)
                  - sum(settlements user paid) + sum(settlements user received)
```

This is fully backward compatible. Old expenses without `expense_splits` rows still work with equal division.

### UI Changes

**Group expense form — split mode selector:**
- After filling Description, Amount, Paid By, and Category, show a "Split" section.
- Three tabs/toggles: **Equal** | **Percentage** | **Exact**
- Default: Equal (all members checked).

**Equal mode:**
- Show a checklist of all group members with checkboxes, all checked by default.
- Unchecking a member excludes them from the split.
- Below the checklist, show calculated per-person amount: "₹600 each (3 people)".

**Percentage mode:**
- Show a list of all group members, each with a percentage input field.
- Default: evenly distributed (e.g., 4 members → 25% each).
- Show a running total at the bottom: "Total: 100% ✓" (green) or "Total: 85% ✗" (red).
- The "Submit" button is disabled until percentages sum to 100%.
- Next to each member's percentage, show the calculated rupee amount.

**Exact mode:**
- Show a list of all group members, each with an amount input field (₹).
- Default: all blank.
- Show a running total: "Total: ₹1,800 / ₹2,400" with progress.
- "Submit" is disabled until amounts sum to the expense total.

**Group expense list — split indicator:**
- Expenses with non-equal splits show a small icon or label: "⚡ Custom split" in muted text below the description.
- Clicking/tapping the expense row opens a detail view showing who owes what:
  ```
  Firewood — ₹600 (paid by Rohan)
  Split: Exact
    Rohan:  ₹0   (paid)
    Kabir:  ₹200
    Aisha:  ₹400
  ```

### Validation Rules
- Percentage mode: all values must be >= 0 and sum to exactly 100.
- Exact mode: all values must be >= 0 and sum to exactly the expense amount.
- At least one member must be included in the split.
- The payer can have a share of ₹0 (they paid but don't owe anything, e.g., a gift).

---

## FEATURE 6: Recurring Expenses

### What
Let users mark a group expense as recurring with a set frequency. The app auto-creates a new expense entry on the specified schedule using Supabase Edge Functions (cron).

### Why
Flatmate groups have monthly bills (rent, WiFi, maid) that are the same amount every time. Manually re-entering them each month is tedious.

### Database Changes
```sql
CREATE TABLE recurring_expenses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES shared_groups(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  category TEXT DEFAULT 'Bills',
  paid_by_user UUID NOT NULL REFERENCES users(id),
  split_type TEXT DEFAULT 'equal' CHECK (split_type IN ('equal', 'percentage', 'exact')),
  frequency TEXT NOT NULL CHECK (frequency IN ('weekly', 'monthly')),
  next_due DATE NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE recurring_expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view recurring expenses" ON recurring_expenses
  FOR SELECT USING (public.is_group_member(group_id));

CREATE POLICY "Users can insert recurring expenses" ON recurring_expenses
  FOR INSERT WITH CHECK (public.is_group_member(group_id));

CREATE POLICY "Users can update recurring expenses" ON recurring_expenses
  FOR UPDATE USING (created_by = auth.uid());

CREATE POLICY "Users can delete recurring expenses" ON recurring_expenses
  FOR DELETE USING (created_by = auth.uid());
```

If using the unequal splits feature, also store the split template:
```sql
CREATE TABLE recurring_expense_splits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  recurring_expense_id UUID NOT NULL REFERENCES recurring_expenses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  amount DECIMAL(12,2) NOT NULL,
  UNIQUE(recurring_expense_id, user_id)
);
```

### Supabase Edge Function (Cron Job)

Create a Supabase Edge Function `process-recurring-expenses` that runs daily at midnight IST (18:30 UTC):

```
Schedule: 30 18 * * *
```

Logic:
1. Query `recurring_expenses` where `is_active = true` AND `next_due <= CURRENT_DATE`.
2. For each matching record:
   a. Insert a new row into `group_expenses` with the same description, amount, category, paid_by_user, and today's date.
   b. If the recurring expense has splits, copy them into `expense_splits` for the new expense.
   c. Update `next_due` to the next occurrence (add 7 days for weekly, 1 month for monthly).
3. Log the count of expenses created.

The Edge Function uses the Supabase service role key (bypasses RLS) since it runs server-side.

### UI Changes

**Group detail page — "Recurring" tab or section:**
- Add a new section or tab titled "Recurring Bills" inside the group detail page.
- "Add Recurring Expense" button opens a form similar to the regular expense form, but with two extra fields:
  - Frequency dropdown: Weekly | Monthly
  - Start Date: date picker (defaults to today)
- The form also supports the split mode selector (Equal / Percentage / Exact) from Feature 5.

**Recurring expenses list:**
- Each recurring expense shows: description, amount, frequency, next due date, paid by, and an on/off toggle.
- Turning the toggle off sets `is_active = false` (pauses it without deleting).
- A red trash icon deletes the recurring expense entirely (with confirmation modal).

**Auto-created expenses in the main expense list:**
- Expenses auto-created by the cron job appear in the regular group expense list with a small 🔄 icon and "(auto)" label to distinguish them from manually entered ones.

---

## FEATURE 7: Expense Comments / Notes Thread

### What
Add a small comment thread to each group expense so members can discuss a specific charge without switching to WhatsApp.

### Why
"What was this ₹2,400 charge?" is a common question. A comment thread keeps the context attached to the expense itself instead of lost in a group chat.

### Database Changes
```sql
CREATE TABLE expense_comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  expense_id UUID NOT NULL REFERENCES group_expenses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  content TEXT NOT NULL CHECK (char_length(content) <= 500),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE expense_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view comments" ON expense_comments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM group_expenses ge
      WHERE ge.id = expense_id
        AND public.is_group_member(ge.group_id)
    )
  );

CREATE POLICY "Users can insert comments" ON expense_comments
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM group_expenses ge
      WHERE ge.id = expense_id
        AND public.is_group_member(ge.group_id)
    )
  );

CREATE POLICY "Users can delete own comments" ON expense_comments
  FOR DELETE USING (user_id = auth.uid());
```

### UI Changes

**Group expense list — comment indicator:**
- Each expense row shows a small 💬 icon with a comment count badge (e.g., "💬 3") if comments exist.
- If zero comments, show the icon in muted gray with no count.

**Expense detail view / comment thread:**
- Clicking an expense row (or the comment icon) expands the row or opens a slide-out panel showing:
  1. Full expense details (amount, paid by, category, date, receipt if attached, split breakdown if custom).
  2. A comment thread below, showing messages oldest-first:
     ```
     Rohan · 2h ago
     This was for the bonfire wood and lighter fluid

     Aisha · 1h ago
     Can you split it differently? I didn't use the lighter
     ```
  3. A text input at the bottom with a "Send" button (or Enter to submit).
- Comments show the user's name, relative timestamp, and the message.
- Each comment has a small "Delete" option (only visible to the comment author).

### Constraints
- Max comment length: 500 characters. Show character counter when typing.
- No nested replies — flat thread only (keeps it simple).
- No real-time updates in v1 (user refreshes to see new comments). Can be upgraded to Supabase Realtime later.

---

## FEATURE 8: Export to CSV/PDF

### What
Let users download their personal spending history or a group's full ledger as a CSV file or a styled PDF summary.

### Why
Users want to import spending data into their own spreadsheets for budgeting. A PDF summary of a trip is a nice keepsake and useful if someone needs to file expense reports.

### Implementation Approach
This is a **client-side export** — no server-side PDF generation needed. Use:
- CSV: generate in-browser using plain JavaScript string building.
- PDF: use the browser's `window.print()` with a print-specific CSS stylesheet, or a lightweight library like `jsPDF` + `jsPDF-autotable`.

### UI Changes

**Personal expenses page (`/dashboard/expenses`):**
- Add an "Export" dropdown button in the top-right corner of the expenses section.
- Options: "Download CSV" | "Download PDF".
- CSV exports ALL personal expenses (not just the current page), fetched via a single Supabase query with no pagination limit.
- PDF generates a formatted document with:
  - Title: "Personal Expenses — {User Name}"
  - Date range: earliest to latest expense
  - Summary stats (same 4 cards: total, this month, count, average)
  - Table: Date | Description | Category | Amount
  - Footer: "Generated by Bill Spill on {date}"

**Group detail page (`/dashboard/groups/[id]`):**
- Add an "Export" dropdown button in the group header area.
- Options: "Download CSV" | "Download PDF".
- CSV columns: Date, Description, Amount, Paid By, Category, Split Type.
- PDF includes:
  - Title: "{Group Name} — Expense Report"
  - Member list
  - Expense table
  - Category breakdown summary
  - Current "Who Owes Who" balances
  - Settlement history (if any)
  - Footer: "Generated by Bill Spill on {date}"

### CSV Format
```csv
Date,Description,Amount,Category
2026-06-15,Taxi to office,450,Transport
2026-06-14,Lunch with team,800,Food
```

For group CSV:
```csv
Date,Description,Amount,Paid By,Category,Split Type
2026-06-15,Firewood,600,Rohan,Shopping,equal
2026-06-14,Hotel booking,12000,Aisha,Stay,exact
```

### File Naming
- Personal: `bill-spill-expenses-{YYYY-MM-DD}.csv` or `.pdf`
- Group: `bill-spill-{group-name-slugified}-{YYYY-MM-DD}.csv` or `.pdf`

---

## FEATURE 9: Dark Mode

### What
Add a system-aware dark mode toggle. Users can choose Light, Dark, or System (follows OS preference). The preference persists across sessions.

### Why
Many students use their laptops at night. Dark mode reduces eye strain and is an expected feature in 2026.

### Implementation

**No database changes needed.** Store the preference in `localStorage` under the key `bill-spill-theme` with values: `light`, `dark`, or `system`.

**Tailwind setup:**
- In `tailwind.config.js`, set `darkMode: 'class'`.
- This means dark mode activates when `<html class="dark">` is present.

**Theme initialization (prevent flash):**
Add a blocking script in the `<head>` of the root layout (`src/app/layout.js`) that reads `localStorage` and applies the `dark` class before the page paints:

```javascript
// This runs before React hydrates, preventing a flash of wrong theme
const script = `
  (function() {
    const theme = localStorage.getItem('bill-spill-theme') || 'system';
    const isDark = theme === 'dark' || 
      (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    if (isDark) document.documentElement.classList.add('dark');
  })();
`;
```

**UI changes — theme toggle:**
- Add a theme toggle button in the sidebar, above the Logout button.
- Three states cycling on click: ☀️ Light → 🌙 Dark → 💻 System.
- Show the current mode as a small label next to the icon.
- On mobile (collapsed sidebar), the toggle should also be accessible from the hamburger menu.

**Color scheme application:**
- Go through every component and add `dark:` variants for:
  - Background: `bg-white` → `dark:bg-gray-900`
  - Cards: `bg-white` → `dark:bg-gray-800`
  - Text: `text-gray-900` → `dark:text-gray-100`
  - Borders: `border-gray-200` → `dark:border-gray-700`
  - Inputs: `bg-gray-50` → `dark:bg-gray-800`, `border-gray-300` → `dark:border-gray-600`
  - Sidebar: keep the existing dark sidebar as-is (it's already dark-themed based on the PRD).
  - Stat cards: `bg-white` → `dark:bg-gray-800`
  - Category badges: keep their color but adjust opacity/saturation for dark backgrounds.
  - Buttons: primary buttons (blue/green) stay the same; outline/ghost buttons get `dark:` variants.
  - Modals: `bg-white` → `dark:bg-gray-800`, backdrop stays dark semi-transparent.
  - Toast notifications: `bg-white` → `dark:bg-gray-800`.
  - The login/signup pages: `bg-gray-100` → `dark:bg-gray-950`, card `bg-white` → `dark:bg-gray-900`.

**System preference listener:**
When the user has selected "System" mode, add a `matchMedia` listener that dynamically adds/removes the `dark` class when the OS preference changes:

```javascript
window.matchMedia('(prefers-color-scheme: dark)')
  .addEventListener('change', (e) => {
    if (localStorage.getItem('bill-spill-theme') === 'system') {
      document.documentElement.classList.toggle('dark', e.matches);
    }
  });
```

---

## Implementation Order (Recommended)

Implement in this order to minimize merge conflicts and build on prior work:

| Priority | Feature | Depends On | Estimated Effort |
|---|---|---|---|
| 1 | Settlement History | Nothing | ~3 hours |
| 2 | Expense Categories for Groups | Nothing | ~2 hours |
| 3 | Currency Formatting Toggle | Nothing | ~2 hours |
| 4 | Dark Mode | Nothing | ~3 hours |
| 5 | Receipt Photo Upload | Nothing (but test after settlements) | ~4 hours |
| 6 | Unequal Splits | Settlement History (affects algorithm) | ~6 hours |
| 7 | Expense Comments | Nothing | ~3 hours |
| 8 | Recurring Expenses | Unequal Splits (for split templates) | ~5 hours |
| 9 | Export to CSV/PDF | All above (exports need to include all data) | ~4 hours |

Total estimated effort: ~32 hours across all 9 features.

---

## SQL Migration Summary

Run these in your Supabase SQL Editor in order:

```sql
-- Migration 1: Group expense categories
ALTER TABLE group_expenses ADD COLUMN category TEXT DEFAULT 'Other';

-- Migration 2: Receipt URLs
ALTER TABLE personal_expenses ADD COLUMN receipt_url TEXT DEFAULT NULL;
ALTER TABLE group_expenses ADD COLUMN receipt_url TEXT DEFAULT NULL;

-- Migration 3: Currency per group
ALTER TABLE shared_groups ADD COLUMN currency TEXT DEFAULT 'INR';

-- Migration 4: Settlements
CREATE TABLE settlements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES shared_groups(id) ON DELETE CASCADE,
  payer_id UUID NOT NULL REFERENCES users(id),
  payee_id UUID NOT NULL REFERENCES users(id),
  amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
  note TEXT DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE settlements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view settlements" ON settlements FOR SELECT USING (public.is_group_member(group_id));
CREATE POLICY "Users can insert settlements" ON settlements FOR INSERT WITH CHECK (public.is_group_member(group_id) AND payer_id = auth.uid());
CREATE POLICY "Users can delete own settlements" ON settlements FOR DELETE USING (payer_id = auth.uid() AND created_at > NOW() - INTERVAL '24 hours');

-- Migration 5: Unequal splits
ALTER TABLE group_expenses ADD COLUMN split_type TEXT DEFAULT 'equal' CHECK (split_type IN ('equal', 'percentage', 'exact'));
CREATE TABLE expense_splits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  expense_id UUID NOT NULL REFERENCES group_expenses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  amount DECIMAL(12,2) NOT NULL,
  UNIQUE(expense_id, user_id)
);
ALTER TABLE expense_splits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view splits" ON expense_splits FOR SELECT USING (EXISTS (SELECT 1 FROM group_expenses ge WHERE ge.id = expense_id AND public.is_group_member(ge.group_id)));
CREATE POLICY "Users can insert splits" ON expense_splits FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM group_expenses ge WHERE ge.id = expense_id AND public.is_group_member(ge.group_id)));
CREATE POLICY "Users can delete splits" ON expense_splits FOR DELETE USING (EXISTS (SELECT 1 FROM group_expenses ge WHERE ge.id = expense_id AND ge.paid_by_user = auth.uid()));

-- Migration 6: Recurring expenses
CREATE TABLE recurring_expenses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES shared_groups(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  category TEXT DEFAULT 'Bills',
  paid_by_user UUID NOT NULL REFERENCES users(id),
  split_type TEXT DEFAULT 'equal' CHECK (split_type IN ('equal', 'percentage', 'exact')),
  frequency TEXT NOT NULL CHECK (frequency IN ('weekly', 'monthly')),
  next_due DATE NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE recurring_expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view recurring expenses" ON recurring_expenses FOR SELECT USING (public.is_group_member(group_id));
CREATE POLICY "Users can insert recurring expenses" ON recurring_expenses FOR INSERT WITH CHECK (public.is_group_member(group_id));
CREATE POLICY "Users can update recurring expenses" ON recurring_expenses FOR UPDATE USING (created_by = auth.uid());
CREATE POLICY "Users can delete recurring expenses" ON recurring_expenses FOR DELETE USING (created_by = auth.uid());
CREATE TABLE recurring_expense_splits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  recurring_expense_id UUID NOT NULL REFERENCES recurring_expenses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  amount DECIMAL(12,2) NOT NULL,
  UNIQUE(recurring_expense_id, user_id)
);

-- Migration 7: Expense comments
CREATE TABLE expense_comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  expense_id UUID NOT NULL REFERENCES group_expenses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  content TEXT NOT NULL CHECK (char_length(content) <= 500),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE expense_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view comments" ON expense_comments FOR SELECT USING (EXISTS (SELECT 1 FROM group_expenses ge WHERE ge.id = expense_id AND public.is_group_member(ge.group_id)));
CREATE POLICY "Users can insert comments" ON expense_comments FOR INSERT WITH CHECK (user_id = auth.uid() AND EXISTS (SELECT 1 FROM group_expenses ge WHERE ge.id = expense_id AND public.is_group_member(ge.group_id)));
CREATE POLICY "Users can delete own comments" ON expense_comments FOR DELETE USING (user_id = auth.uid());
```

---

## How to Use This PRD with Claude Code

Save this file as `PRD-v2.md` in your project root. Then in Claude Code:

```
> Read PRD-v2.md and implement Feature 3: Settlement History
```

Work through one feature at a time. After each feature, test it locally with `npm run dev`, then commit:

```bash
git add . && git commit -m "feat: add settlement history with settle-up button"
```

Then move to the next:

```
> Read PRD-v2.md and implement Feature 2: Expense Categories for Group Bills
```
