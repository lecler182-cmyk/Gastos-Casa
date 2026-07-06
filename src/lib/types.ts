export type Profile = {
  id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  household_id: string | null;
};

export type Household = {
  id: string;
  name: string;
  currency: string;
  creator_share: number;
  invite_code: string;
  created_by: string;
};

export type Category = {
  id: string;
  household_id: string;
  name: string;
  icon: string;
  color: string;
};

export type Scope = "personal" | "shared";

export type Expense = {
  id: string;
  household_id: string;
  paid_by: string;
  category_id: string | null;
  amount: number;
  date: string;
  note: string | null;
  scope: Scope;
};

export type Income = {
  id: string;
  household_id: string;
  user_id: string;
  amount: number;
  source: string | null;
  date: string;
  note: string | null;
};

export type Budget = {
  id: string;
  household_id: string;
  category_id: string;
  monthly_limit: number;
};

export type RecurringExpense = {
  id: string;
  household_id: string;
  paid_by: string;
  category_id: string | null;
  amount: number;
  note: string | null;
  scope: Scope;
  day_of_month: number;
  active: boolean;
  last_generated: string | null;
};

export type Settlement = {
  id: string;
  household_id: string;
  from_user: string;
  to_user: string;
  amount: number;
  date: string;
  note: string | null;
};
