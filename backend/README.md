# Portfolio inquiry inbox

POST endpoint: https://ihmayqzxqyednchbezya.supabase.co/functions/v1/portfolio-inquiry

The form saves to `portfolio.inquiries` in the existing sparktory-prod project. The schema/table are private, with RLS enabled and no anonymous table or RPC access. Only the isolated server function can submit through the service-role RPC. Public contact-config.json contains the existing anonymous client key, never a service-role key.

Owner retrieval: sign in to the Supabase project and open https://supabase.com/dashboard/project/ihmayqzxqyednchbezya/editor/880365?schema=portfolio . Select portfolio.inquiries if the editor resets its schema selection. The SQL editor or authenticated owner MCP can also run:

```sql
select id, created_at, name, email, project_type, budget, timeline, message, status
from portfolio.inquiries order by created_at desc limit 50;
```

No email or push notifications are configured. Check the private inbox for new inquiries; status can be changed from new to read, replied or closed there. No outgoing messages were sent. Controlled API and real browser submissions were retrieved by the authenticated owner and then deleted by exact test id/name/email. Anonymous schema, table SELECT and submit RPC privileges were verified false.

The endpoint validates origin, request size, required fields and project type, checks a honeypot, uses idempotent request IDs and rate-limits submissions. Only a keyed hash of the network address is retained. Source is portfolio-inquiry.ts and portfolio-inquiries.sql. Existing app functions and tables were not changed.
