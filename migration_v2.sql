-- Storage bucket setup for receipts (Note: if you haven't created the 'receipts' bucket, you must do so in the Storage tab of the Supabase dashboard first)
-- Run the following in the SQL Editor:

-- Migration 1: Group expense categories
ALTER TABLE group_expenses ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'Other';

-- Migration 2: Receipt URLs
ALTER TABLE personal_expenses ADD COLUMN IF NOT EXISTS receipt_url TEXT DEFAULT NULL;
ALTER TABLE group_expenses ADD COLUMN IF NOT EXISTS receipt_url TEXT DEFAULT NULL;

-- Migration 3: Currency per group
ALTER TABLE shared_groups ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'INR';

-- Migration 4: Settlements
CREATE TABLE IF NOT EXISTS settlements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES shared_groups(id) ON DELETE CASCADE,
  paid_by UUID NOT NULL REFERENCES users(id),
  paid_to UUID NOT NULL REFERENCES users(id),
  amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
  note TEXT DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE settlements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view settlements" ON settlements;
CREATE POLICY "Users can view settlements" ON settlements FOR SELECT USING (public.is_group_member(group_id));
DROP POLICY IF EXISTS "Users can insert settlements" ON settlements;
CREATE POLICY "Users can insert settlements" ON settlements FOR INSERT WITH CHECK (public.is_group_member(group_id) AND paid_by = auth.uid());
DROP POLICY IF EXISTS "Users can delete own settlements" ON settlements;
CREATE POLICY "Users can delete own settlements" ON settlements FOR DELETE USING (paid_by = auth.uid() AND created_at > NOW() - INTERVAL '24 hours');

-- Migration 5: Unequal splits
ALTER TABLE group_expenses ADD COLUMN IF NOT EXISTS split_type TEXT DEFAULT 'equal' CHECK (split_type IN ('equal', 'percentage', 'exact'));
CREATE TABLE IF NOT EXISTS expense_splits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  expense_id UUID NOT NULL REFERENCES group_expenses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  amount DECIMAL(12,2) NOT NULL,
  UNIQUE(expense_id, user_id)
);
ALTER TABLE expense_splits ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view splits" ON expense_splits;
CREATE POLICY "Users can view splits" ON expense_splits FOR SELECT USING (EXISTS (SELECT 1 FROM group_expenses ge WHERE ge.id = expense_id AND public.is_group_member(ge.group_id)));
DROP POLICY IF EXISTS "Users can insert splits" ON expense_splits;
CREATE POLICY "Users can insert splits" ON expense_splits FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM group_expenses ge WHERE ge.id = expense_id AND public.is_group_member(ge.group_id)));
DROP POLICY IF EXISTS "Users can delete splits" ON expense_splits;
CREATE POLICY "Users can delete splits" ON expense_splits FOR DELETE USING (EXISTS (SELECT 1 FROM group_expenses ge WHERE ge.id = expense_id AND ge.paid_by_user = auth.uid()));

-- Migration 6: Recurring expenses
CREATE TABLE IF NOT EXISTS recurring_expenses (
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
DROP POLICY IF EXISTS "Users can view recurring expenses" ON recurring_expenses;
CREATE POLICY "Users can view recurring expenses" ON recurring_expenses FOR SELECT USING (public.is_group_member(group_id));
DROP POLICY IF EXISTS "Users can insert recurring expenses" ON recurring_expenses;
CREATE POLICY "Users can insert recurring expenses" ON recurring_expenses FOR INSERT WITH CHECK (public.is_group_member(group_id));
DROP POLICY IF EXISTS "Users can update recurring expenses" ON recurring_expenses;
CREATE POLICY "Users can update recurring expenses" ON recurring_expenses FOR UPDATE USING (created_by = auth.uid());
DROP POLICY IF EXISTS "Users can delete recurring expenses" ON recurring_expenses;
CREATE POLICY "Users can delete recurring expenses" ON recurring_expenses FOR DELETE USING (created_by = auth.uid());

CREATE TABLE IF NOT EXISTS recurring_expense_splits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  recurring_expense_id UUID NOT NULL REFERENCES recurring_expenses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  amount DECIMAL(12,2) NOT NULL,
  UNIQUE(recurring_expense_id, user_id)
);
ALTER TABLE recurring_expense_splits ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view recurring splits" ON recurring_expense_splits;
CREATE POLICY "Users can view recurring splits" ON recurring_expense_splits FOR SELECT USING (EXISTS (SELECT 1 FROM recurring_expenses re WHERE re.id = recurring_expense_id AND public.is_group_member(re.group_id)));
DROP POLICY IF EXISTS "Users can insert recurring splits" ON recurring_expense_splits;
CREATE POLICY "Users can insert recurring splits" ON recurring_expense_splits FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM recurring_expenses re WHERE re.id = recurring_expense_id AND public.is_group_member(re.group_id)));
DROP POLICY IF EXISTS "Users can delete recurring splits" ON recurring_expense_splits;
CREATE POLICY "Users can delete recurring splits" ON recurring_expense_splits FOR DELETE USING (EXISTS (SELECT 1 FROM recurring_expenses re WHERE re.id = recurring_expense_id AND re.created_by = auth.uid()));


-- Migration 7: Expense comments
CREATE TABLE IF NOT EXISTS expense_comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  expense_id UUID NOT NULL REFERENCES group_expenses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  content TEXT NOT NULL CHECK (char_length(content) <= 500),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE expense_comments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view comments" ON expense_comments;
CREATE POLICY "Users can view comments" ON expense_comments FOR SELECT USING (EXISTS (SELECT 1 FROM group_expenses ge WHERE ge.id = expense_id AND public.is_group_member(ge.group_id)));
DROP POLICY IF EXISTS "Users can insert comments" ON expense_comments;
CREATE POLICY "Users can insert comments" ON expense_comments FOR INSERT WITH CHECK (user_id = auth.uid() AND EXISTS (SELECT 1 FROM group_expenses ge WHERE ge.id = expense_id AND public.is_group_member(ge.group_id)));
DROP POLICY IF EXISTS "Users can delete own comments" ON expense_comments;
CREATE POLICY "Users can delete own comments" ON expense_comments FOR DELETE USING (user_id = auth.uid());


-- Note: Storage policies for receipts
-- You must first create a Storage bucket named 'receipts'
-- Then, you can run the following to set up RLS policies on the bucket:
DROP POLICY IF EXISTS "Users can upload receipts" ON storage.objects;
CREATE POLICY "Users can upload receipts" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'receipts'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Users can view own receipts" ON storage.objects;
CREATE POLICY "Users can view own receipts" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'receipts'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Users can view group receipts" ON storage.objects;
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
