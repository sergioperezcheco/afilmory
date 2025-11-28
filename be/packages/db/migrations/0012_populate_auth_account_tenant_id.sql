UPDATE "auth_account" 
SET "tenant_id" = "auth_user"."tenant_id"
FROM "auth_user"
WHERE "auth_account"."user_id" = "auth_user"."id"
  AND "auth_account"."tenant_id" IS NULL
  AND "auth_user"."tenant_id" IS NOT NULL;--> statement-breakpoint

