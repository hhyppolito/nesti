ALTER TABLE public.finance_transactions ADD COLUMN subcategory text, ADD COLUMN expense_type text NOT NULL DEFAULT 'unclassified' CHECK(expense_type IN ('fixed','variable','unclassified')), ADD COLUMN necessity text NOT NULL DEFAULT 'unclassified' CHECK(necessity IN ('essential','adjustable','unclassified')), ADD COLUMN taxonomy_method text NOT NULL DEFAULT 'suggested';
GRANT UPDATE(subcategory,expense_type,necessity) ON public.finance_transactions TO authenticated;
CREATE OR REPLACE FUNCTION public.finance_transaction_stamp() RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $f$
BEGIN NEW.version:=OLD.version+1; NEW.updated_at:=now(); NEW.updated_by:=auth.uid(); IF auth.uid() IS NOT NULL THEN NEW.category_method:='manual'; NEW.taxonomy_method:='manual'; END IF; RETURN NEW; END $f$;
CREATE TABLE public.finance_monthly_plans(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),household_id uuid NOT NULL REFERENCES public.finance_households(id),
 scope_key text NOT NULL CHECK(scope_key IN ('all','abanca','activo') OR scope_key ~ '^account:[a-f0-9-]{36}$'),month date NOT NULL CHECK(extract(day from month)=1),
 spending_limit numeric(16,2) NOT NULL CHECK(spending_limit>=0),savings_target numeric(16,2) NOT NULL DEFAULT 0 CHECK(savings_target>=0),
 emergency_balance numeric(16,2) CHECK(emergency_balance>=0),notes text NOT NULL DEFAULT '',version integer NOT NULL DEFAULT 1,
 created_by uuid REFERENCES auth.users(id) DEFAULT auth.uid(),updated_by uuid REFERENCES auth.users(id) DEFAULT auth.uid(),
 created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),UNIQUE(household_id,scope_key,month));
CREATE TABLE public.finance_budget_lines(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),household_id uuid NOT NULL REFERENCES public.finance_households(id),scope_key text NOT NULL CHECK(scope_key IN ('all','abanca','activo') OR scope_key ~ '^account:[a-f0-9-]{36}$'),
 month date NOT NULL CHECK(extract(day from month)=1),category text NOT NULL CHECK(length(trim(category)) BETWEEN 1 AND 100),
 amount_limit numeric(16,2) NOT NULL CHECK(amount_limit>=0),active boolean NOT NULL DEFAULT true,version integer NOT NULL DEFAULT 1,
 created_by uuid REFERENCES auth.users(id) DEFAULT auth.uid(),updated_by uuid REFERENCES auth.users(id) DEFAULT auth.uid(),
 created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),UNIQUE(household_id,scope_key,month,category));
CREATE TABLE public.finance_income_streams(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),household_id uuid NOT NULL REFERENCES public.finance_households(id),account_id uuid NOT NULL,
 person text NOT NULL CHECK(length(trim(person)) BETWEEN 1 AND 100),label text NOT NULL CHECK(length(trim(label)) BETWEEN 1 AND 150),
 net_monthly numeric(16,2) NOT NULL CHECK(net_monthly>=0),pay_day integer CHECK(pay_day BETWEEN 1 AND 31),
 start_month date NOT NULL CHECK(extract(day from start_month)=1),end_month date CHECK(extract(day from end_month)=1 AND end_month>=start_month),
 version integer NOT NULL DEFAULT 1,created_by uuid REFERENCES auth.users(id) DEFAULT auth.uid(),updated_by uuid REFERENCES auth.users(id) DEFAULT auth.uid(),
 created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(household_id,account_id) REFERENCES public.finance_accounts(household_id,id));
CREATE TABLE public.finance_investment_snapshots(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),household_id uuid NOT NULL REFERENCES public.finance_households(id),account_id uuid,
 asset_label text NOT NULL CHECK(length(trim(asset_label)) BETWEEN 1 AND 150),institution text NOT NULL DEFAULT '',asset_class text NOT NULL DEFAULT 'other' CHECK(asset_class IN ('etf','fund','ppr','deposit','stock','bond','cash','other')),
 as_of date NOT NULL,market_value numeric(16,2) NOT NULL CHECK(market_value>=0),net_contributed numeric(16,2) CHECK(net_contributed>=0),
 notes text NOT NULL DEFAULT '',version integer NOT NULL DEFAULT 1,created_by uuid REFERENCES auth.users(id) DEFAULT auth.uid(),updated_by uuid REFERENCES auth.users(id) DEFAULT auth.uid(),
 created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(household_id,account_id) REFERENCES public.finance_accounts(household_id,id),UNIQUE(household_id,asset_label,as_of));
CREATE FUNCTION public.finance_planning_stamp() RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $f$
BEGIN IF NEW.id IS DISTINCT FROM OLD.id OR NEW.household_id IS DISTINCT FROM OLD.household_id OR NEW.created_by IS DISTINCT FROM OLD.created_by OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN RAISE EXCEPTION 'Record identity cannot be changed'; END IF; NEW.version:=OLD.version+1;NEW.updated_at:=now();NEW.updated_by:=auth.uid();RETURN NEW;END $f$;
REVOKE ALL ON FUNCTION public.finance_planning_stamp() FROM PUBLIC,anon,authenticated;
CREATE TABLE public.finance_ai_reports(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),household_id uuid NOT NULL REFERENCES public.finance_households(id),
 scope_key text NOT NULL,period_start date NOT NULL,period_end date NOT NULL,data_cutoff date NOT NULL,
 title text NOT NULL,body text NOT NULL,metrics jsonb NOT NULL DEFAULT '{}'::jsonb,data_fingerprint text NOT NULL,
 generator text NOT NULL DEFAULT 'assistant' CHECK(generator IN ('assistant','api')),created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE public.finance_analysis_requests(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),household_id uuid NOT NULL REFERENCES public.finance_households(id),scope_key text NOT NULL,
 month date NOT NULL CHECK(extract(day from month)=1),status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','complete','failed')),
 requested_by uuid NOT NULL REFERENCES auth.users(id) DEFAULT auth.uid(),created_at timestamptz NOT NULL DEFAULT now());
CREATE UNIQUE INDEX finance_analysis_pending_idx ON public.finance_analysis_requests(household_id,scope_key,month) WHERE status='pending';
DO $b$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['finance_monthly_plans','finance_budget_lines','finance_income_streams','finance_investment_snapshots'] LOOP
 EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',t);
 EXECUTE format('REVOKE ALL ON public.%I FROM PUBLIC,anon,authenticated',t);
 EXECUTE format('GRANT SELECT,INSERT,UPDATE ON public.%I TO authenticated',t);
 EXECUTE format('GRANT ALL ON public.%I TO service_role',t);
 EXECUTE format('CREATE INDEX %I ON public.%I(household_id)',t||'_household_idx',t);
 EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING(EXISTS(SELECT 1 FROM public.finance_members m WHERE m.household_id=%I.household_id AND m.user_id=(SELECT auth.uid())))',t||'_read',t,t);
 EXECUTE format('CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK(created_by=(SELECT auth.uid()) AND EXISTS(SELECT 1 FROM public.finance_members m WHERE m.household_id=%I.household_id AND m.user_id=(SELECT auth.uid()) AND m.role=''manager''))',t||'_insert',t,t);
 EXECUTE format('CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING(EXISTS(SELECT 1 FROM public.finance_members m WHERE m.household_id=%I.household_id AND m.user_id=(SELECT auth.uid()) AND m.role=''manager'')) WITH CHECK(EXISTS(SELECT 1 FROM public.finance_members m WHERE m.household_id=%I.household_id AND m.user_id=(SELECT auth.uid()) AND m.role=''manager''))',t||'_update',t,t,t);
 EXECUTE format('CREATE TRIGGER %I BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.finance_planning_stamp()',t||'_stamp',t);
 END LOOP;
END $b$;
ALTER TABLE public.finance_ai_reports ENABLE ROW LEVEL SECURITY;ALTER TABLE public.finance_analysis_requests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.finance_ai_reports,public.finance_analysis_requests FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.finance_ai_reports,public.finance_analysis_requests TO authenticated;
GRANT INSERT ON public.finance_analysis_requests TO authenticated;GRANT ALL ON public.finance_ai_reports,public.finance_analysis_requests TO service_role;
CREATE INDEX finance_ai_reports_home_scope_idx ON public.finance_ai_reports(household_id,scope_key,created_at DESC);
CREATE INDEX finance_requests_home_idx ON public.finance_analysis_requests(household_id);
CREATE POLICY finance_ai_reports_read ON public.finance_ai_reports FOR SELECT TO authenticated USING(EXISTS(SELECT 1 FROM public.finance_members m WHERE m.household_id=finance_ai_reports.household_id AND m.user_id=(SELECT auth.uid())));
CREATE POLICY finance_requests_read ON public.finance_analysis_requests FOR SELECT TO authenticated USING(EXISTS(SELECT 1 FROM public.finance_members m WHERE m.household_id=finance_analysis_requests.household_id AND m.user_id=(SELECT auth.uid())));
CREATE POLICY finance_requests_create ON public.finance_analysis_requests FOR INSERT TO authenticated WITH CHECK(status='pending' AND requested_by=(SELECT auth.uid()) AND EXISTS(SELECT 1 FROM public.finance_members m WHERE m.household_id=finance_analysis_requests.household_id AND m.user_id=(SELECT auth.uid()) AND m.role='manager'));
