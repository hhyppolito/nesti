CREATE TABLE public.finance_households (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 name text NOT NULL CHECK(length(trim(name)) BETWEEN 1 AND 120),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.finance_members (
 household_id uuid NOT NULL REFERENCES public.finance_households(id),
 user_id uuid NOT NULL REFERENCES auth.users(id),
 role text NOT NULL DEFAULT 'manager' CHECK(role IN ('manager','viewer')),
 created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(household_id,user_id)
);
CREATE INDEX finance_members_user_id_idx ON public.finance_members(user_id,household_id);
CREATE TABLE public.finance_notes (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 household_id uuid NOT NULL REFERENCES public.finance_households(id),
 title text NOT NULL CHECK(length(trim(title)) BETWEEN 1 AND 200),
 body text NOT NULL DEFAULT '' CHECK(length(body)<=20000),
 kind text NOT NULL DEFAULT 'idea' CHECK(kind IN ('idea','bug','decision','question')),
 status text NOT NULL DEFAULT 'to_review' CHECK(status IN ('to_review','planned','in_progress','done','archived')),
 resolution text NOT NULL DEFAULT '' CHECK(length(resolution)<=20000),
 created_by uuid REFERENCES auth.users(id) DEFAULT auth.uid(),
 updated_by uuid REFERENCES auth.users(id) DEFAULT auth.uid(),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 version integer NOT NULL DEFAULT 1 CHECK(version>0)
);
CREATE INDEX finance_notes_household_status_idx ON public.finance_notes(household_id,status,updated_at DESC);
ALTER TABLE public.finance_households ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_notes ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.finance_households,public.finance_members,public.finance_notes FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.finance_households,public.finance_members TO authenticated;
GRANT SELECT,INSERT,UPDATE ON public.finance_notes TO authenticated;
GRANT ALL ON public.finance_households,public.finance_members,public.finance_notes TO service_role;
CREATE POLICY finance_members_read_self ON public.finance_members FOR SELECT TO authenticated USING(user_id=(SELECT auth.uid()));
CREATE POLICY finance_households_read_member ON public.finance_households FOR SELECT TO authenticated USING(EXISTS(SELECT 1 FROM public.finance_members m WHERE m.household_id=finance_households.id AND m.user_id=(SELECT auth.uid())));
CREATE POLICY finance_notes_read_member ON public.finance_notes FOR SELECT TO authenticated USING(EXISTS(SELECT 1 FROM public.finance_members m WHERE m.household_id=finance_notes.household_id AND m.user_id=(SELECT auth.uid())));
CREATE POLICY finance_notes_insert_manager ON public.finance_notes FOR INSERT TO authenticated WITH CHECK(
 created_by=(SELECT auth.uid()) AND updated_by=(SELECT auth.uid()) AND
 EXISTS(SELECT 1 FROM public.finance_members m WHERE m.household_id=finance_notes.household_id AND m.user_id=(SELECT auth.uid()) AND m.role='manager'));
CREATE POLICY finance_notes_update_manager ON public.finance_notes FOR UPDATE TO authenticated
 USING(EXISTS(SELECT 1 FROM public.finance_members m WHERE m.household_id=finance_notes.household_id AND m.user_id=(SELECT auth.uid()) AND m.role='manager'))
 WITH CHECK(EXISTS(SELECT 1 FROM public.finance_members m WHERE m.household_id=finance_notes.household_id AND m.user_id=(SELECT auth.uid()) AND m.role='manager'));
CREATE FUNCTION public.finance_note_stamp() RETURNS trigger
 LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $fn$
 BEGIN
  IF TG_OP='UPDATE' THEN
   IF NEW.id IS DISTINCT FROM OLD.id OR NEW.household_id IS DISTINCT FROM OLD.household_id OR NEW.created_by IS DISTINCT FROM OLD.created_by OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'Note identity and authorship cannot be changed';
   END IF;
   NEW.version:=OLD.version+1;
  ELSE
   NEW.created_by:=auth.uid();
   NEW.created_at:=now();
   NEW.version:=1;
  END IF;
  NEW.updated_by:=auth.uid();
  NEW.updated_at:=now();
  RETURN NEW;
 END;
 $fn$;
REVOKE ALL ON FUNCTION public.finance_note_stamp() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER finance_notes_stamp BEFORE INSERT OR UPDATE ON public.finance_notes FOR EACH ROW EXECUTE FUNCTION public.finance_note_stamp();
