CREATE TABLE "user_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_sessions_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text,
	"phone" text NOT NULL,
	"email" text,
	"city" text,
	"area" text,
	"avatar" text,
	"language" text DEFAULT 'en' NOT NULL,
	"otp" text,
	"otp_expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_phone_unique" UNIQUE("phone")
);
--> statement-breakpoint
CREATE TABLE "admin_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"admin_id" integer NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "admin_sessions_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "admins" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"password_hash" text NOT NULL,
	"name" text,
	"role" text DEFAULT 'admin' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_login_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "admins_username_unique" UNIQUE("username")
);
--> statement-breakpoint
CREATE TABLE "runner_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"runner_id" integer NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "runner_sessions_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "runners" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text,
	"phone" text NOT NULL,
	"email" text,
	"city" text,
	"area" text,
	"avatar" text,
	"gender" text,
	"kyc_status" text DEFAULT 'pending' NOT NULL,
	"kyc_rejection_reason" text,
	"is_online" boolean DEFAULT false NOT NULL,
	"rating" numeric(3, 2),
	"total_tasks" integer DEFAULT 0 NOT NULL,
	"total_earnings" numeric(10, 2),
	"current_lat" numeric(10, 8),
	"current_lng" numeric(11, 8),
	"full_name" text,
	"aadhaar_number" text,
	"aadhaar_front" text,
	"aadhaar_back" text,
	"selfie" text,
	"bank_account" text,
	"bank_ifsc" text,
	"bank_account_holder" text,
	"emergency_contact_name" text,
	"emergency_contact_phone" text,
	"emergency_contact_relation" text,
	"otp" text,
	"otp_expires_at" timestamp with time zone,
	"onboarding_step" integer DEFAULT 0 NOT NULL,
	"onboarding_completed" boolean DEFAULT false NOT NULL,
	"dispatch_allowed" boolean DEFAULT false NOT NULL,
	"gps_status" text,
	"gps_checked_at" timestamp with time zone,
	"trust_score" integer DEFAULT 50 NOT NULL,
	"trust_badge" text DEFAULT 'improving' NOT NULL,
	"tasks_accepted" integer DEFAULT 0 NOT NULL,
	"tasks_completed" integer DEFAULT 0 NOT NULL,
	"tasks_cancelled" integer DEFAULT 0 NOT NULL,
	"average_rating" numeric(3, 2),
	"average_response_time" numeric(8, 2),
	"late_arrivals" integer DEFAULT 0 NOT NULL,
	"on_time_arrivals" integer DEFAULT 0 NOT NULL,
	"repeat_clients" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "runners_phone_unique" UNIQUE("phone")
);
--> statement-breakpoint
CREATE TABLE "tasks" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"runner_id" integer,
	"category" text NOT NULL,
	"description" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"urgency" text DEFAULT 'normal' NOT NULL,
	"location_name" text,
	"location_area" text,
	"location_city" text,
	"location_lat" numeric(10, 8),
	"location_lng" numeric(11, 8),
	"distance_band" text,
	"scheduled_at" timestamp with time zone,
	"base_price" numeric(8, 2) DEFAULT '0' NOT NULL,
	"distance_charge" numeric(8, 2) DEFAULT '0' NOT NULL,
	"urgency_charge" numeric(8, 2) DEFAULT '0' NOT NULL,
	"price" numeric(8, 2) DEFAULT '0' NOT NULL,
	"runner_earning" numeric(8, 2) DEFAULT '0' NOT NULL,
	"platform_fee" numeric(8, 2) DEFAULT '0' NOT NULL,
	"payment_method" text DEFAULT 'online' NOT NULL,
	"payment_status" text DEFAULT 'pending' NOT NULL,
	"coupon_code" text,
	"discount_amount" numeric(8, 2) DEFAULT '0' NOT NULL,
	"otp" text,
	"otp_verified" boolean DEFAULT false NOT NULL,
	"senior_involved" boolean DEFAULT false NOT NULL,
	"special_instructions" text,
	"proof_photos" text[] DEFAULT '{}' NOT NULL,
	"cancel_reason" text,
	"internal_notes" text,
	"completed_at" timestamp with time zone,
	"pickup_required" boolean DEFAULT false NOT NULL,
	"pickup_address" text,
	"pickup_area" text,
	"pickup_lat" numeric(10, 8),
	"pickup_lng" numeric(11, 8),
	"task_lat" numeric(10, 8),
	"task_lng" numeric(11, 8),
	"from_area" text,
	"to_area" text,
	"estimated_duration_minutes" integer,
	"accepted_at" timestamp with time zone,
	"started_at" timestamp with time zone,
	"reached_pickup_at" timestamp with time zone,
	"reached_task_location_at" timestamp with time zone,
	"task_timeline" text[] DEFAULT '{}' NOT NULL,
	"priority_level" text DEFAULT 'normal' NOT NULL,
	"priority_fee" numeric(8, 2) DEFAULT '0' NOT NULL,
	"waiting_charge_amount" numeric(8, 2) DEFAULT '0' NOT NULL,
	"waiting_earnings" numeric(8, 2) DEFAULT '0' NOT NULL,
	"bonus_earnings" numeric(8, 2) DEFAULT '0' NOT NULL,
	"invoice_number" text,
	"waiting_started_at" timestamp with time zone,
	"waiting_ended_at" timestamp with time zone,
	"total_waiting_minutes" integer,
	"queue_type" text,
	"token_number" text,
	"current_token" text,
	"counter_number" text,
	"family_contact_name" text,
	"family_contact_phone" text,
	"family_tracking_token" text,
	"family_token_expires_at" timestamp with time zone,
	"gps_verified" boolean,
	"gps_distance_from_task" integer,
	"otp_attempts" integer DEFAULT 0 NOT NULL,
	"otp_expires_at" timestamp with time zone,
	"otp_locked_until" timestamp with time zone,
	"fraud_flags" text[] DEFAULT '{}' NOT NULL,
	"expected_token_number" text,
	"queue_gap" integer,
	"estimated_wait_minutes" integer,
	"queue_progress_percent" integer,
	"queue_notes" text,
	"dispatch_attempts" integer DEFAULT 0 NOT NULL,
	"dispatch_radius_used" integer DEFAULT 0 NOT NULL,
	"dispatch_notified_count" integer DEFAULT 0 NOT NULL,
	"time_to_acceptance" integer,
	"active_runner_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"runner_id" integer,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"is_read" boolean DEFAULT false NOT NULL,
	"task_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reviews" (
	"id" serial PRIMARY KEY NOT NULL,
	"task_id" integer NOT NULL,
	"user_id" integer,
	"runner_id" integer,
	"rating" integer NOT NULL,
	"review" text,
	"feedback" text,
	"issue_report" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "subscription_plans" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"price_monthly" numeric(10, 2) NOT NULL,
	"price_yearly" numeric(10, 2) NOT NULL,
	"tasks_per_month" integer,
	"features" text[] DEFAULT '{}' NOT NULL,
	"badge" text,
	"is_popular" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"plan_id" text NOT NULL,
	"plan_name" text NOT NULL,
	"billing_cycle" text DEFAULT 'monthly' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"tasks_per_month" integer,
	"tasks_used" integer DEFAULT 0 NOT NULL,
	"start_date" timestamp with time zone DEFAULT now() NOT NULL,
	"end_date" timestamp with time zone,
	"amount" numeric(10, 2) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "admin_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"app_name" text DEFAULT 'Go LineLess' NOT NULL,
	"company_name" text DEFAULT 'IBNAY IFTRIBE PRIVATE LIMITED' NOT NULL,
	"support_phone" text DEFAULT '+91-9999999999' NOT NULL,
	"support_email" text DEFAULT 'support@golineless.com' NOT NULL,
	"whatsapp_number" text DEFAULT '+91-9999999999' NOT NULL,
	"runner_payout_percent" numeric(5, 2) DEFAULT '70' NOT NULL,
	"urgency_surcharge" numeric(8, 2) DEFAULT '50' NOT NULL,
	"cancellation_fee" numeric(8, 2) DEFAULT '0' NOT NULL,
	"max_tasks_per_runner_per_day" integer DEFAULT 20 NOT NULL,
	"maintenance_mode" boolean DEFAULT false NOT NULL,
	"free_waiting_minutes" integer DEFAULT 15 NOT NULL,
	"waiting_charge_per_minute" numeric(5, 2) DEFAULT '2' NOT NULL,
	"priority_fee_amount" numeric(8, 2) DEFAULT '49' NOT NULL,
	"emergency_fee_amount" numeric(8, 2) DEFAULT '99' NOT NULL,
	"urgency_normal_multiplier" numeric(3, 2) DEFAULT '1.0' NOT NULL,
	"urgency_urgent_multiplier" numeric(3, 2) DEFAULT '1.25' NOT NULL,
	"urgency_emergency_multiplier" numeric(3, 2) DEFAULT '1.5' NOT NULL,
	"gps_validation_radius" integer DEFAULT 250 NOT NULL,
	"waiting_bracket1_min" integer DEFAULT 30 NOT NULL,
	"waiting_bracket1_charge" numeric(8, 2) DEFAULT '0' NOT NULL,
	"waiting_bracket2_min" integer DEFAULT 60 NOT NULL,
	"waiting_bracket2_charge" numeric(8, 2) DEFAULT '30' NOT NULL,
	"waiting_bracket3_min" integer DEFAULT 120 NOT NULL,
	"waiting_bracket3_charge" numeric(8, 2) DEFAULT '80' NOT NULL,
	"waiting_bracket4_charge" numeric(8, 2) DEFAULT '150' NOT NULL,
	"dispatch_initial_radius" integer DEFAULT 3 NOT NULL,
	"dispatch_expand_delay" integer DEFAULT 60 NOT NULL,
	"dispatch_max_radius" integer DEFAULT 20 NOT NULL,
	"queue_eta_multiplier_hospital" numeric(3, 1) DEFAULT '5' NOT NULL,
	"queue_eta_multiplier_bank" numeric(3, 1) DEFAULT '2' NOT NULL,
	"queue_eta_multiplier_govt" numeric(3, 1) DEFAULT '8' NOT NULL,
	"queue_eta_multiplier_default" numeric(3, 1) DEFAULT '3' NOT NULL,
	"pilot_mode" boolean DEFAULT false NOT NULL,
	"pilot_categories" text[] DEFAULT '{"medicine","document","bank","govt_office","courier","senior_care"}' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "device_tokens" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"runner_id" integer,
	"token" text NOT NULL,
	"platform" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "runner_locations" (
	"id" serial PRIMARY KEY NOT NULL,
	"runner_id" integer NOT NULL,
	"task_id" integer,
	"lat" numeric(10, 8) NOT NULL,
	"lng" numeric(11, 8) NOT NULL,
	"heading" numeric(5, 2) DEFAULT '0',
	"speed" numeric(5, 2) DEFAULT '0',
	"recorded_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "recruitments" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"phone" text NOT NULL,
	"area" text NOT NULL,
	"vehicle_type" text DEFAULT 'bicycle' NOT NULL,
	"languages" text[] DEFAULT '{"{hindi}"}' NOT NULL,
	"availability" text DEFAULT 'full_time' NOT NULL,
	"stage" text DEFAULT 'applied' NOT NULL,
	"notes" text,
	"interview_date" timestamp with time zone,
	"documents_submitted_at" timestamp with time zone,
	"training_completed_at" timestamp with time zone,
	"training_score" integer,
	"activated_at" timestamp with time zone,
	"runner_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "runner_training" (
	"id" serial PRIMARY KEY NOT NULL,
	"runner_id" integer NOT NULL,
	"module_id" integer NOT NULL,
	"completed" boolean DEFAULT false NOT NULL,
	"score" integer,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "training_modules" (
	"id" serial PRIMARY KEY NOT NULL,
	"topic" text NOT NULL,
	"description" text,
	"order" integer DEFAULT 0 NOT NULL,
	"is_required" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quality_reviews" (
	"id" serial PRIMARY KEY NOT NULL,
	"task_id" integer NOT NULL,
	"runner_id" integer NOT NULL,
	"customer_rating" integer,
	"customer_feedback" text,
	"comrade_feedback" text,
	"task_quality_score" integer,
	"sla_grade" text,
	"acceptance_time_seconds" integer,
	"arrival_time_minutes" integer,
	"completion_time_minutes" integer,
	"reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "incidents" (
	"id" serial PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"task_id" integer,
	"runner_id" integer,
	"user_id" integer,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"severity" text DEFAULT 'medium' NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"assigned_admin" text,
	"resolution" text,
	"resolved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "support_tickets" (
	"id" serial PRIMARY KEY NOT NULL,
	"ticket_id" text NOT NULL,
	"task_id" integer,
	"user_id" integer,
	"runner_id" integer,
	"subject" text NOT NULL,
	"description" text NOT NULL,
	"category" text DEFAULT 'general' NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"priority" text DEFAULT 'normal' NOT NULL,
	"assigned_admin" text,
	"resolution" text,
	"refund_amount" integer,
	"resolution_time_minutes" integer,
	"resolved_at" timestamp with time zone,
	"closed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user_sessions" ADD CONSTRAINT "user_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admin_sessions" ADD CONSTRAINT "admin_sessions_admin_id_admins_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."admins"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "runner_sessions" ADD CONSTRAINT "runner_sessions_runner_id_runners_id_fk" FOREIGN KEY ("runner_id") REFERENCES "public"."runners"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_runner_id_runners_id_fk" FOREIGN KEY ("runner_id") REFERENCES "public"."runners"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_runner_id_runners_id_fk" FOREIGN KEY ("runner_id") REFERENCES "public"."runners"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_runner_id_runners_id_fk" FOREIGN KEY ("runner_id") REFERENCES "public"."runners"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_plan_id_subscription_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."subscription_plans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "device_tokens" ADD CONSTRAINT "device_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "device_tokens" ADD CONSTRAINT "device_tokens_runner_id_runners_id_fk" FOREIGN KEY ("runner_id") REFERENCES "public"."runners"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "runner_locations" ADD CONSTRAINT "runner_locations_runner_id_runners_id_fk" FOREIGN KEY ("runner_id") REFERENCES "public"."runners"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "runner_locations" ADD CONSTRAINT "runner_locations_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "runner_training" ADD CONSTRAINT "runner_training_module_id_training_modules_id_fk" FOREIGN KEY ("module_id") REFERENCES "public"."training_modules"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quality_reviews" ADD CONSTRAINT "quality_reviews_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quality_reviews" ADD CONSTRAINT "quality_reviews_runner_id_runners_id_fk" FOREIGN KEY ("runner_id") REFERENCES "public"."runners"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "incidents" ADD CONSTRAINT "incidents_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "incidents" ADD CONSTRAINT "incidents_runner_id_runners_id_fk" FOREIGN KEY ("runner_id") REFERENCES "public"."runners"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "incidents" ADD CONSTRAINT "incidents_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_tasks_user_id" ON "tasks" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_tasks_runner_id" ON "tasks" USING btree ("runner_id");--> statement-breakpoint
CREATE INDEX "idx_tasks_status" ON "tasks" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_tasks_created_at" ON "tasks" USING btree ("created_at");