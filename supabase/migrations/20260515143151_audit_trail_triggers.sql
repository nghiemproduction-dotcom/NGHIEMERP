/*
  # Add audit trail triggers for financial operations

  1. Changes
    - Create trigger function `log_audit_trail()` that inserts into audit_trail on any INSERT/UPDATE/DELETE
    - Add triggers on: finance_transactions, receivables, payables, expense_requests
    - Each trigger logs: action (INSERT/UPDATE/DELETE), table_name, record_id, old_data, new_data, performed_by
  2. Security
    - Trigger functions run with SECURITY DEFINER (superuser)
    - Audit records are read-only via RLS (no DELETE/UPDATE policies)
*/

-- Trigger function for audit logging
CREATE OR REPLACE FUNCTION log_audit_trail() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO audit_trail (action, table_name, record_id, new_data, performed_by)
    VALUES ('INSERT', TG_TABLE_NAME, NEW.id::text, to_jsonb(NEW), auth.uid());
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO audit_trail (action, table_name, record_id, old_data, new_data, performed_by)
    VALUES ('UPDATE', TG_TABLE_NAME, NEW.id::text, to_jsonb(OLD), to_jsonb(NEW), auth.uid());
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO audit_trail (action, table_name, record_id, old_data, performed_by)
    VALUES ('DELETE', TG_TABLE_NAME, OLD.id::text, to_jsonb(OLD), auth.uid());
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add triggers for financial tables
DROP TRIGGER IF EXISTS audit_finance_transactions ON finance_transactions;
CREATE TRIGGER audit_finance_transactions
  AFTER INSERT OR UPDATE OR DELETE ON finance_transactions
  FOR EACH ROW EXECUTE FUNCTION log_audit_trail();

DROP TRIGGER IF EXISTS audit_receivables ON receivables;
CREATE TRIGGER audit_receivables
  AFTER INSERT OR UPDATE OR DELETE ON receivables
  FOR EACH ROW EXECUTE FUNCTION log_audit_trail();

DROP TRIGGER IF EXISTS audit_payables ON payables;
CREATE TRIGGER audit_payables
  AFTER INSERT OR UPDATE OR DELETE ON payables
  FOR EACH ROW EXECUTE FUNCTION log_audit_trail();

DROP TRIGGER IF EXISTS audit_expense_requests ON expense_requests;
CREATE TRIGGER audit_expense_requests
  AFTER INSERT OR UPDATE OR DELETE ON expense_requests
  FOR EACH ROW EXECUTE FUNCTION log_audit_trail();

-- Add trigger for orders (status changes are important to audit)
DROP TRIGGER IF EXISTS audit_orders ON orders;
CREATE TRIGGER audit_orders
  AFTER INSERT OR UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION log_audit_trail();
