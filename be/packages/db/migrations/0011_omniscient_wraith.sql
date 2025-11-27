ALTER TABLE "auth_user" DROP CONSTRAINT "auth_user_email_unique";--> statement-breakpoint
ALTER TABLE "photo_asset" ALTER COLUMN "manifest_version" SET DEFAULT 'v10';--> statement-breakpoint
ALTER TABLE "auth_account" ADD COLUMN "tenant_id" text;--> statement-breakpoint
ALTER TABLE "auth_account" ADD CONSTRAINT "auth_account_tenant_id_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_auth_account_user" ON "auth_account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_auth_account_tenant" ON "auth_account" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_auth_account_provider" ON "auth_account" USING btree ("provider_id","account_id");--> statement-breakpoint
CREATE INDEX "idx_auth_user_email" ON "auth_user" USING btree ("email");--> statement-breakpoint
CREATE INDEX "idx_auth_user_tenant" ON "auth_user" USING btree ("tenant_id");--> statement-breakpoint
ALTER TABLE "auth_account" ADD CONSTRAINT "uq_auth_account_tenant_provider" UNIQUE("tenant_id","provider_id","account_id");--> statement-breakpoint
ALTER TABLE "auth_user" ADD CONSTRAINT "uq_auth_user_tenant_email" UNIQUE("tenant_id","email");