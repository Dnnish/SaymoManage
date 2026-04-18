CREATE TABLE "pets" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"filename" varchar(500) NOT NULL,
	"storage_key" varchar(1000) NOT NULL,
	"mime_type" varchar(255) NOT NULL,
	"size" integer NOT NULL,
	"uploaded_by_id" varchar(36) NOT NULL,
	"uploaded_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "pets" ADD CONSTRAINT "pets_uploaded_by_id_users_id_fk" FOREIGN KEY ("uploaded_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "public"."documents" ALTER COLUMN "folder" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."folder";--> statement-breakpoint
CREATE TYPE "public"."folder" AS ENUM('postes', 'camaras', 'fachadas', 'fotos', 'planos');--> statement-breakpoint
ALTER TABLE "public"."documents" ALTER COLUMN "folder" SET DATA TYPE "public"."folder" USING "folder"::"public"."folder";