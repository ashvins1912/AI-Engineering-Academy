-- LOCAL DEVELOPMENT ONLY. Production DBAs must provision a dedicated role with secret-managed credentials.
DO $$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'academy_app') THEN
    EXECUTE 'CREATE ROLE academy_app LOGIN PASSWORD ''academy-app-local-only''';
  END IF;
END $$;
GRANT CONNECT ON DATABASE academy TO academy_app;
GRANT USAGE ON SCHEMA public TO academy_app;
