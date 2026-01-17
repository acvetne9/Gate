-- Fix function search_path issues for existing functions

-- Fix cleanup_old_logs
CREATE OR REPLACE FUNCTION public.cleanup_old_logs()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    deleted_count integer;
BEGIN
    DELETE FROM request_logs
    WHERE created_at < now() - INTERVAL '90 days';

    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$;

-- Fix cleanup_test_logs
CREATE OR REPLACE FUNCTION public.cleanup_test_logs()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    deleted_count integer;
BEGIN
    DELETE FROM test_logs
    WHERE timestamp < now() - INTERVAL '48 hours';

    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$;

-- Fix update_site_stats
CREATE OR REPLACE FUNCTION public.update_site_stats()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.sites
  SET stats = jsonb_set(
    jsonb_set(
      jsonb_set(
        stats,
        '{totalRequests}',
        to_jsonb((stats->>'totalRequests')::int + 1)
      ),
      '{blockedRequests}',
      to_jsonb((stats->>'blockedRequests')::int + CASE WHEN NEW.status IN ('blocked', 'challenged') THEN 1 ELSE 0 END)
    ),
    '{allowedRequests}',
    to_jsonb((stats->>'allowedRequests')::int + CASE WHEN NEW.status = 'allowed' THEN 1 ELSE 0 END)
  )
  WHERE id = NEW.site_id;
  
  RETURN NEW;
END;
$$;

-- Fix cleanup_old_demo_activity
CREATE OR REPLACE FUNCTION public.cleanup_old_demo_activity()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.public_demo_activity
  WHERE id NOT IN (
    SELECT id FROM public.public_demo_activity
    ORDER BY timestamp DESC
    LIMIT 100
  );
END;
$$;

-- Fix log_admin_action
CREATE OR REPLACE FUNCTION public.log_admin_action()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (SELECT role FROM public.user_profiles WHERE id = auth.uid()) = 'admin' THEN
    INSERT INTO public.admin_audit_log (admin_id, action, target_table, target_id, metadata)
    VALUES (
      auth.uid(), 
      TG_OP, 
      TG_TABLE_NAME, 
      COALESCE(NEW.id, OLD.id),
      CASE 
        WHEN TG_OP = 'DELETE' THEN row_to_json(OLD)
        ELSE row_to_json(NEW)
      END
    );
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;