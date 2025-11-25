CREATE TABLE "photo_access_log" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"photo_asset_id" text NOT NULL,
	"photo_id" text NOT NULL,
	"storage_key" text NOT NULL,
	"provider" text NOT NULL,
	"intent" text DEFAULT 'original' NOT NULL,
	"token_id" text NOT NULL,
	"signed_url" text NOT NULL,
	"status" text DEFAULT 'issued' NOT NULL,
	"client_ip" text,
	"user_agent" text,
	"referer" text,
	"expires_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "photo_access_stat" (
	"tenant_id" text NOT NULL,
	"photo_asset_id" text NOT NULL,
	"photo_id" text NOT NULL,
	"view_count" bigint DEFAULT 0 NOT NULL,
	"last_viewed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "pk_photo_access_stat" PRIMARY KEY("tenant_id","photo_asset_id")
);
--> statement-breakpoint
DROP TABLE "tenant_auth_account" CASCADE;--> statement-breakpoint
DROP TABLE "tenant_auth_session" CASCADE;--> statement-breakpoint
DROP TABLE "tenant_auth_user" CASCADE;--> statement-breakpoint
ALTER TABLE "photo_access_log" ADD CONSTRAINT "photo_access_log_tenant_id_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "photo_access_log" ADD CONSTRAINT "photo_access_log_photo_asset_id_photo_asset_id_fk" FOREIGN KEY ("photo_asset_id") REFERENCES "public"."photo_asset"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "photo_access_stat" ADD CONSTRAINT "photo_access_stat_tenant_id_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "photo_access_stat" ADD CONSTRAINT "photo_access_stat_photo_asset_id_photo_asset_id_fk" FOREIGN KEY ("photo_asset_id") REFERENCES "public"."photo_asset"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_photo_access_log_tenant" ON "photo_access_log" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_photo_access_log_asset" ON "photo_access_log" USING btree ("photo_asset_id");--> statement-breakpoint
CREATE INDEX "idx_photo_access_log_token" ON "photo_access_log" USING btree ("token_id");--> statement-breakpoint
CREATE INDEX "idx_photo_access_stat_photo" ON "photo_access_stat" USING btree ("tenant_id","photo_id");