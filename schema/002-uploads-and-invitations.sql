-- Baseline for a NEW Supabase project. No household records or invitations are included.
SET search_path=public,auth,storage;
CREATE SCHEMA IF NOT EXISTS finance_private;
REVOKE ALL ON SCHEMA finance_private FROM PUBLIC,anon,authenticated;
GRANT USAGE ON SCHEMA finance_private TO service_role;
CREATE TABLE finance_private.member_invitations(
 household_id uuid NOT NULL,
 email text NOT NULL,
 role text DEFAULT 'manager'::text NOT NULL,
 claimed_by uuid,
 claimed_at timestamp with time zone,
 FOREIGN KEY (claimed_by) REFERENCES auth.users(id),
 CHECK ((email = lower(TRIM(BOTH FROM email)))),
 FOREIGN KEY (household_id) REFERENCES finance_households(id),
 PRIMARY KEY (household_id, email),
 CHECK ((role = ANY (ARRAY['manager'::text, 'viewer'::text])))
);
ALTER TABLE finance_private.member_invitations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON finance_private.member_invitations FROM PUBLIC,anon,authenticated;
GRANT ALL ON finance_private.member_invitations TO service_role;
CREATE TABLE public.finance_uploads(
 id uuid DEFAULT gen_random_uuid() NOT NULL,
 household_id uuid NOT NULL,
 original_name text NOT NULL,
 storage_path text NOT NULL,
 file_sha256 text NOT NULL,
 file_size bigint NOT NULL,
 content_type text NOT NULL,
 source_kind text NOT NULL,
 context text DEFAULT ''::text NOT NULL,
 status text DEFAULT 'uploading'::text NOT NULL,
 submitted_by uuid DEFAULT auth.uid() NOT NULL,
 created_at timestamp with time zone DEFAULT now() NOT NULL,
 updated_at timestamp with time zone DEFAULT now() NOT NULL,
 CHECK ((storage_path ~~ ((((household_id)::text || '/'::text) || (id)::text) || '/%'::text))),
 CHECK ((length(context) <= 2000)),
 CHECK ((file_sha256 ~ '^[a-f0-9]{64}$'::text)),
 CHECK (((file_size > 0) AND (file_size <= 20971520))),
 UNIQUE (household_id, file_sha256),
 FOREIGN KEY (household_id) REFERENCES finance_households(id),
 CHECK (((length(original_name) >= 1) AND (length(original_name) <= 250))),
 PRIMARY KEY (id),
 CHECK ((source_kind = ANY (ARRAY['bank_statement'::text, 'investment'::text, 'grocery'::text, 'other'::text]))),
 CHECK ((status = ANY (ARRAY['uploading'::text, 'awaiting_review'::text, 'failed'::text, 'imported'::text, 'rejected'::text]))),
 UNIQUE (storage_path),
 FOREIGN KEY (submitted_by) REFERENCES auth.users(id)
);
ALTER TABLE public.finance_uploads ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.finance_uploads FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE ON public.finance_uploads TO authenticated;
GRANT ALL ON public.finance_uploads TO service_role;
CREATE INDEX finance_uploads_household_idx ON public.finance_uploads(household_id);
CREATE OR REPLACE FUNCTION public.finance_upload_guard()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
BEGIN
 IF NEW.id IS DISTINCT FROM OLD.id OR NEW.household_id IS DISTINCT FROM OLD.household_id OR NEW.original_name IS DISTINCT FROM OLD.original_name OR NEW.storage_path IS DISTINCT FROM OLD.storage_path OR NEW.file_sha256 IS DISTINCT FROM OLD.file_sha256 OR NEW.file_size IS DISTINCT FROM OLD.file_size OR NEW.content_type IS DISTINCT FROM OLD.content_type OR NEW.source_kind IS DISTINCT FROM OLD.source_kind OR NEW.submitted_by IS DISTINCT FROM OLD.submitted_by OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN RAISE EXCEPTION 'Document identity cannot be changed'; END IF;
 IF auth.uid() IS NOT NULL AND NEW.status='awaiting_review' AND NOT EXISTS(SELECT 1 FROM storage.objects WHERE bucket_id='finance-uploads' AND name=NEW.storage_path) THEN RAISE EXCEPTION 'Document upload has not completed'; END IF;
 NEW.updated_at:=now(); RETURN NEW;
END $function$;
CREATE OR REPLACE FUNCTION finance_private.enroll_verified_member()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
 DECLARE invitation record;
 BEGIN
  IF NEW.email_confirmed_at IS NULL OR NEW.email IS NULL THEN RETURN NEW; END IF;
  FOR invitation IN
   UPDATE finance_private.member_invitations SET claimed_by=NEW.id,claimed_at=coalesce(claimed_at,now())
   WHERE email=lower(trim(NEW.email)) AND (claimed_by IS NULL OR claimed_by=NEW.id)
   RETURNING household_id,role
  LOOP
   INSERT INTO public.finance_members(household_id,user_id,role)
   VALUES(invitation.household_id,NEW.id,invitation.role) ON CONFLICT DO NOTHING;
  END LOOP;
  RETURN NEW;
 END;
 $function$;
REVOKE ALL ON FUNCTION public.finance_upload_guard() FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION finance_private.enroll_verified_member() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER finance_enroll_verified_member AFTER INSERT OR UPDATE OF email, email_confirmed_at ON auth.users FOR EACH ROW EXECUTE FUNCTION finance_private.enroll_verified_member();
CREATE TRIGGER finance_uploads_guard BEFORE UPDATE ON public.finance_uploads FOR EACH ROW EXECUTE FUNCTION finance_upload_guard();
INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types) VALUES('finance-uploads','finance-uploads',false,20971520,ARRAY['application/pdf','text/csv','text/plain','application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','image/png','image/jpeg','application/octet-stream']) ON CONFLICT(id) DO NOTHING;
CREATE POLICY finance_uploads_insert_manager ON public.finance_uploads FOR INSERT TO authenticated WITH CHECK (((status = 'uploading'::text) AND (submitted_by = ( SELECT auth.uid() AS uid)) AND (EXISTS ( SELECT 1
   FROM finance_members m
  WHERE ((m.household_id = finance_uploads.household_id) AND (m.user_id = ( SELECT auth.uid() AS uid)) AND (m.role = 'manager'::text))))));
CREATE POLICY finance_uploads_read_member ON public.finance_uploads FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM finance_members m
  WHERE ((m.household_id = finance_uploads.household_id) AND (m.user_id = ( SELECT auth.uid() AS uid))))));
CREATE POLICY finance_uploads_update_submitter ON public.finance_uploads FOR UPDATE TO authenticated USING (((submitted_by = ( SELECT auth.uid() AS uid)) AND (status = ANY (ARRAY['uploading'::text, 'failed'::text])) AND (EXISTS ( SELECT 1
   FROM finance_members m
  WHERE ((m.household_id = finance_uploads.household_id) AND (m.user_id = ( SELECT auth.uid() AS uid)) AND (m.role = 'manager'::text)))))) WITH CHECK (((submitted_by = ( SELECT auth.uid() AS uid)) AND (status = ANY (ARRAY['uploading'::text, 'awaiting_review'::text, 'failed'::text])) AND (EXISTS ( SELECT 1
   FROM finance_members m
  WHERE ((m.household_id = finance_uploads.household_id) AND (m.user_id = ( SELECT auth.uid() AS uid)) AND (m.role = 'manager'::text))))));
CREATE POLICY finance_documents_cleanup ON storage.objects FOR DELETE TO authenticated USING (((bucket_id = 'finance-uploads'::text) AND (EXISTS ( SELECT 1
   FROM finance_uploads u
  WHERE ((u.storage_path = objects.name) AND (u.submitted_by = ( SELECT auth.uid() AS uid)) AND (u.status = ANY (ARRAY['uploading'::text, 'failed'::text])))))));
CREATE POLICY finance_documents_read ON storage.objects FOR SELECT TO authenticated USING (((bucket_id = 'finance-uploads'::text) AND (EXISTS ( SELECT 1
   FROM finance_members m
  WHERE (((m.household_id)::text = (storage.foldername(objects.name))[1]) AND (m.user_id = ( SELECT auth.uid() AS uid)))))));
CREATE POLICY finance_documents_upload ON storage.objects FOR INSERT TO authenticated WITH CHECK (((bucket_id = 'finance-uploads'::text) AND (EXISTS ( SELECT 1
   FROM (finance_uploads u
     JOIN finance_members m ON ((m.household_id = u.household_id)))
  WHERE ((u.storage_path = objects.name) AND (u.status = 'uploading'::text) AND (u.submitted_by = ( SELECT auth.uid() AS uid)) AND (m.user_id = ( SELECT auth.uid() AS uid)) AND (m.role = 'manager'::text))))));
