CREATE TABLE "alerts" (
	"id" serial PRIMARY KEY NOT NULL,
	"token_id" integer NOT NULL,
	"type" varchar(50) NOT NULL,
	"severity" varchar(20) NOT NULL,
	"message" text NOT NULL,
	"data" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "research_reports" (
	"id" serial PRIMARY KEY NOT NULL,
	"token_id" integer NOT NULL,
	"summary" text,
	"tokenomics" jsonb,
	"roadmap" jsonb,
	"team" jsonb,
	"risks" jsonb,
	"github_stats" jsonb,
	"audit_status" text,
	"version" integer DEFAULT 1,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "sentiment_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"token_id" integer NOT NULL,
	"score" numeric(3, 2),
	"buzz" integer,
	"source" varchar(50),
	"raw_output" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "tokens" (
	"id" serial PRIMARY KEY NOT NULL,
	"address" varchar(42) NOT NULL,
	"symbol" varchar(20) NOT NULL,
	"name" varchar(100),
	"network" varchar(50) DEFAULT 'ethereum',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "tokens_address_unique" UNIQUE("address")
);
--> statement-breakpoint
CREATE TABLE "top_gainers_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"symbol" varchar(20) NOT NULL,
	"price_change_percent" numeric(20, 6) NOT NULL,
	"last_price" numeric(30, 10),
	"observation_time" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_token_id_tokens_id_fk" FOREIGN KEY ("token_id") REFERENCES "public"."tokens"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "research_reports" ADD CONSTRAINT "research_reports_token_id_tokens_id_fk" FOREIGN KEY ("token_id") REFERENCES "public"."tokens"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sentiment_logs" ADD CONSTRAINT "sentiment_logs_token_id_tokens_id_fk" FOREIGN KEY ("token_id") REFERENCES "public"."tokens"("id") ON DELETE no action ON UPDATE no action;