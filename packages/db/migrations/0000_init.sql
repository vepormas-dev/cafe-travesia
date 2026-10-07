CREATE TABLE `addresses` (
	`id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`label` varchar(60) NOT NULL DEFAULT 'Casa',
	`recipient` varchar(160) NOT NULL,
	`phone` varchar(40) NOT NULL,
	`region` varchar(80) NOT NULL,
	`city` varchar(80) NOT NULL,
	`line1` varchar(200) NOT NULL,
	`line2` varchar(200),
	`notes` varchar(300),
	`is_default` boolean NOT NULL DEFAULT false,
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `addresses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `audit_log` (
	`id` varchar(36) NOT NULL,
	`user_id` varchar(36),
	`action` varchar(80) NOT NULL,
	`entity` varchar(60) NOT NULL,
	`entity_id` varchar(120),
	`meta` longtext,
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `audit_log_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `blog_posts` (
	`id` varchar(36) NOT NULL,
	`slug` varchar(180) NOT NULL,
	`title` varchar(220) NOT NULL,
	`excerpt` varchar(400),
	`content` mediumtext,
	`cover_url` varchar(500),
	`category` varchar(80),
	`tags` longtext,
	`author_name` varchar(120),
	`reading_min` int NOT NULL DEFAULT 4,
	`status` enum('draft','scheduled','published') NOT NULL DEFAULT 'draft',
	`is_featured` boolean NOT NULL DEFAULT false,
	`published_at` datetime(3),
	`seo_title` varchar(200),
	`seo_description` varchar(320),
	`views` int NOT NULL DEFAULT 0,
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `blog_posts_id` PRIMARY KEY(`id`),
	CONSTRAINT `posts_slug` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `carts` (
	`id` varchar(36) NOT NULL,
	`user_id` varchar(36),
	`email` varchar(191),
	`items` longtext,
	`subtotal_cop` int NOT NULL DEFAULT 0,
	`reminded_at` datetime(3),
	`recovered_order_id` varchar(36),
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `carts_id` PRIMARY KEY(`id`),
	CONSTRAINT `carts_user` UNIQUE(`user_id`)
);
--> statement-breakpoint
CREATE TABLE `certificates` (
	`id` varchar(36) NOT NULL,
	`code` varchar(24) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`course_id` varchar(36) NOT NULL,
	`holder_name` varchar(160) NOT NULL,
	`course_title` varchar(200) NOT NULL,
	`hours` int NOT NULL DEFAULT 0,
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`revoked_at` datetime(3),
	CONSTRAINT `certificates_id` PRIMARY KEY(`id`),
	CONSTRAINT `cert_code` UNIQUE(`code`),
	CONSTRAINT `cert_user_course` UNIQUE(`user_id`,`course_id`)
);
--> statement-breakpoint
CREATE TABLE `chat_messages` (
	`id` varchar(36) NOT NULL,
	`session_id` varchar(36) NOT NULL,
	`role` enum('user','assistant','agent','system') NOT NULL,
	`content` text NOT NULL,
	`actions` longtext,
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `chat_messages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `chat_sessions` (
	`id` varchar(36) NOT NULL,
	`user_id` varchar(36),
	`visitor_id` varchar(64),
	`name` varchar(160),
	`email` varchar(191),
	`channel` enum('web','app') NOT NULL DEFAULT 'web',
	`status` enum('bot','human_requested','human','closed') NOT NULL DEFAULT 'bot',
	`assigned_to` varchar(36),
	`summary` text,
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `chat_sessions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `coupon_redemptions` (
	`id` varchar(36) NOT NULL,
	`coupon_id` varchar(36) NOT NULL,
	`order_id` varchar(36) NOT NULL,
	`user_id` varchar(36),
	`email` varchar(191) NOT NULL,
	`discount_cop` int NOT NULL,
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `coupon_redemptions_id` PRIMARY KEY(`id`),
	CONSTRAINT `redemptions_order` UNIQUE(`order_id`)
);
--> statement-breakpoint
CREATE TABLE `coupons` (
	`id` varchar(36) NOT NULL,
	`code` varchar(40) NOT NULL,
	`description` varchar(240),
	`kind` enum('percent','fixed','free_shipping') NOT NULL DEFAULT 'percent',
	`value` int NOT NULL DEFAULT 0,
	`scope` enum('all','products','courses') NOT NULL DEFAULT 'all',
	`min_subtotal_cop` int NOT NULL DEFAULT 0,
	`max_uses` int,
	`max_uses_per_user` int DEFAULT 1,
	`uses` int NOT NULL DEFAULT 0,
	`starts_at` datetime(3),
	`ends_at` datetime(3),
	`is_active` boolean NOT NULL DEFAULT true,
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `coupons_id` PRIMARY KEY(`id`),
	CONSTRAINT `coupons_code` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `course_modules` (
	`id` varchar(36) NOT NULL,
	`course_id` varchar(36) NOT NULL,
	`title` varchar(200) NOT NULL,
	`position` int NOT NULL DEFAULT 0,
	CONSTRAINT `course_modules_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `courses` (
	`id` varchar(36) NOT NULL,
	`slug` varchar(160) NOT NULL,
	`title` varchar(200) NOT NULL,
	`subtitle` varchar(300),
	`description` mediumtext,
	`cover_url` varchar(500),
	`trailer_url` varchar(500),
	`level` enum('principiante','intermedio','avanzado') NOT NULL DEFAULT 'principiante',
	`category` varchar(80),
	`instructor_name` varchar(160),
	`instructor_title` varchar(160),
	`instructor_bio` text,
	`instructor_avatar_url` varchar(500),
	`price_cop` int NOT NULL DEFAULT 0,
	`compare_at_cop` int,
	`is_free` boolean NOT NULL DEFAULT false,
	`included_in_subscription` boolean NOT NULL DEFAULT false,
	`what_you_learn` longtext,
	`requirements` longtext,
	`resources` longtext,
	`duration_min` int NOT NULL DEFAULT 0,
	`certificate_enabled` boolean NOT NULL DEFAULT true,
	`rating_avg` double NOT NULL DEFAULT 0,
	`rating_count` int NOT NULL DEFAULT 0,
	`is_published` boolean NOT NULL DEFAULT false,
	`is_featured` boolean NOT NULL DEFAULT false,
	`sort_order` int NOT NULL DEFAULT 0,
	`seo_title` varchar(200),
	`seo_description` varchar(320),
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `courses_id` PRIMARY KEY(`id`),
	CONSTRAINT `courses_slug` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `enrollments` (
	`id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`course_id` varchar(36) NOT NULL,
	`source` enum('purchase','subscription','admin','free') NOT NULL,
	`order_id` varchar(36),
	`status` enum('active','completed','revoked') NOT NULL DEFAULT 'active',
	`progress_pct` int NOT NULL DEFAULT 0,
	`last_lesson_id` varchar(36),
	`completed_at` datetime(3),
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `enrollments_id` PRIMARY KEY(`id`),
	CONSTRAINT `enroll_user_course` UNIQUE(`user_id`,`course_id`)
);
--> statement-breakpoint
CREATE TABLE `integration_events` (
	`id` varchar(36) NOT NULL,
	`source` varchar(30) NOT NULL,
	`event` varchar(80) NOT NULL,
	`status` enum('ok','error','ignored') NOT NULL DEFAULT 'ok',
	`external_id` varchar(120),
	`message` varchar(1000),
	`duration_ms` int,
	`payload` longtext,
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `integration_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `leads` (
	`id` varchar(36) NOT NULL,
	`name` varchar(160) NOT NULL,
	`email` varchar(191) NOT NULL,
	`phone` varchar(40),
	`company` varchar(160),
	`source` varchar(60) NOT NULL DEFAULT 'contacto',
	`interest` varchar(80),
	`message` text,
	`status` enum('new','contacted','qualified','won','lost') NOT NULL DEFAULT 'new',
	`score` int,
	`notes` text,
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `leads_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `lesson_notes` (
	`id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`lesson_id` varchar(36) NOT NULL,
	`at_s` int NOT NULL DEFAULT 0,
	`body` text NOT NULL,
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `lesson_notes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `lesson_progress` (
	`user_id` varchar(36) NOT NULL,
	`lesson_id` varchar(36) NOT NULL,
	`course_id` varchar(36) NOT NULL,
	`position_s` int NOT NULL DEFAULT 0,
	`completed` boolean NOT NULL DEFAULT false,
	`completed_at` datetime(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `lesson_progress_user_id_lesson_id_pk` PRIMARY KEY(`user_id`,`lesson_id`)
);
--> statement-breakpoint
CREATE TABLE `lessons` (
	`id` varchar(36) NOT NULL,
	`course_id` varchar(36) NOT NULL,
	`module_id` varchar(36) NOT NULL,
	`title` varchar(200) NOT NULL,
	`summary` varchar(500),
	`content` mediumtext,
	`video_url` varchar(600),
	`video_provider` enum('bunny','mp4','hls','youtube','vimeo') NOT NULL DEFAULT 'mp4',
	`duration_s` int NOT NULL DEFAULT 0,
	`is_preview` boolean NOT NULL DEFAULT false,
	`resources` longtext,
	`position` int NOT NULL DEFAULT 0,
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `lessons_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `loyalty_ledger` (
	`id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`points` int NOT NULL,
	`reason` varchar(160) NOT NULL,
	`order_id` varchar(36),
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `loyalty_ledger_id` PRIMARY KEY(`id`),
	CONSTRAINT `loyalty_order_reason` UNIQUE(`order_id`,`reason`)
);
--> statement-breakpoint
CREATE TABLE `media_assets` (
	`id` varchar(36) NOT NULL,
	`path` varchar(400) NOT NULL,
	`url` varchar(600) NOT NULL,
	`folder` varchar(80) NOT NULL DEFAULT 'general',
	`alt` varchar(300),
	`mime` varchar(80),
	`size_bytes` int,
	`width` int,
	`height` int,
	`uploaded_by` varchar(36),
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `media_assets_id` PRIMARY KEY(`id`),
	CONSTRAINT `media_path` UNIQUE(`path`)
);
--> statement-breakpoint
CREATE TABLE `newsletter_subscribers` (
	`email` varchar(191) NOT NULL,
	`source` varchar(60) NOT NULL DEFAULT 'web',
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`unsubscribed_at` datetime(3),
	CONSTRAINT `newsletter_subscribers_email` PRIMARY KEY(`email`)
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`title` varchar(120) NOT NULL,
	`body` varchar(400) NOT NULL,
	`deep_link` varchar(300),
	`kind` varchar(40) NOT NULL DEFAULT 'general',
	`read_at` datetime(3),
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `order_items` (
	`id` varchar(36) NOT NULL,
	`order_id` varchar(36) NOT NULL,
	`item_kind` enum('product','course','plan') NOT NULL,
	`product_id` varchar(36),
	`variant_id` varchar(36),
	`course_id` varchar(36),
	`plan_id` varchar(36),
	`name` varchar(200) NOT NULL,
	`variant_name` varchar(160),
	`image_url` varchar(500),
	`unit_price_cop` int NOT NULL,
	`quantity` int NOT NULL DEFAULT 1,
	`total_cop` int NOT NULL,
	CONSTRAINT `order_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `orders` (
	`id` varchar(36) NOT NULL,
	`number` varchar(24) NOT NULL,
	`user_id` varchar(36),
	`email` varchar(191) NOT NULL,
	`customer_name` varchar(160) NOT NULL,
	`phone` varchar(40),
	`legal_id_type` varchar(8),
	`legal_id` varchar(40),
	`kind` enum('store','course','subscription','mixed') NOT NULL DEFAULT 'store',
	`channel` enum('web','app','admin','pos') NOT NULL DEFAULT 'web',
	`status` enum('pending','paid','preparing','shipped','delivered','cancelled','refunded','failed') NOT NULL DEFAULT 'pending',
	`subtotal_cop` int NOT NULL,
	`discount_cop` int NOT NULL DEFAULT 0,
	`shipping_cop` int NOT NULL DEFAULT 0,
	`total_cop` int NOT NULL,
	`coupon_code` varchar(40),
	`points_redeemed` int NOT NULL DEFAULT 0,
	`points_earned` int NOT NULL DEFAULT 0,
	`requires_shipping` boolean NOT NULL DEFAULT true,
	`shipping_address` longtext,
	`payment_method` varchar(40),
	`wompi_reference` varchar(64) NOT NULL,
	`wompi_transaction_id` varchar(64),
	`subscription_id` varchar(36),
	`paid_at` datetime(3),
	`carrier` varchar(60),
	`tracking_number` varchar(80),
	`tracking_url` varchar(500),
	`shipped_at` datetime(3),
	`delivered_at` datetime(3),
	`cancelled_at` datetime(3),
	`notes` varchar(500),
	`internal_notes` text,
	`utm` longtext,
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `orders_id` PRIMARY KEY(`id`),
	CONSTRAINT `orders_number` UNIQUE(`number`),
	CONSTRAINT `orders_reference` UNIQUE(`wompi_reference`)
);
--> statement-breakpoint
CREATE TABLE `page_views` (
	`day` varchar(10) NOT NULL,
	`path` varchar(191) NOT NULL,
	`source` varchar(60) NOT NULL DEFAULT 'directo',
	`device` enum('desktop','mobile','app') NOT NULL DEFAULT 'desktop',
	`views` int NOT NULL DEFAULT 0,
	CONSTRAINT `page_views_day_path_source_device_pk` PRIMARY KEY(`day`,`path`,`source`,`device`)
);
--> statement-breakpoint
CREATE TABLE `payment_events` (
	`id` varchar(36) NOT NULL,
	`provider` varchar(20) NOT NULL DEFAULT 'wompi',
	`event` varchar(60) NOT NULL,
	`external_id` varchar(80) NOT NULL,
	`reference` varchar(80),
	`status` varchar(30) NOT NULL,
	`signature_ok` boolean NOT NULL DEFAULT false,
	`payload` longtext,
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `payment_events_id` PRIMARY KEY(`id`),
	CONSTRAINT `payment_events_dedupe` UNIQUE(`provider`,`external_id`,`status`)
);
--> statement-breakpoint
CREATE TABLE `product_reviews` (
	`id` varchar(36) NOT NULL,
	`product_id` varchar(36),
	`course_id` varchar(36),
	`user_id` varchar(36) NOT NULL,
	`rating` tinyint NOT NULL,
	`title` varchar(160),
	`body` text,
	`status` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
	`verified` boolean NOT NULL DEFAULT false,
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `product_reviews_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `product_variants` (
	`id` varchar(36) NOT NULL,
	`product_id` varchar(36) NOT NULL,
	`name` varchar(120) NOT NULL,
	`weight_g` int,
	`grind` varchar(40),
	`price_cop` int NOT NULL,
	`compare_at_cop` int,
	`stock` int NOT NULL DEFAULT 0,
	`sku` varchar(80),
	`event_at` datetime(3),
	`is_active` boolean NOT NULL DEFAULT true,
	`sort_order` int NOT NULL DEFAULT 0,
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `product_variants_id` PRIMARY KEY(`id`),
	CONSTRAINT `variants_sku` UNIQUE(`sku`)
);
--> statement-breakpoint
CREATE TABLE `products` (
	`id` varchar(36) NOT NULL,
	`slug` varchar(160) NOT NULL,
	`name` varchar(160) NOT NULL,
	`subtitle` varchar(240),
	`kind` enum('coffee','merch','accessory','kit','experience') NOT NULL DEFAULT 'coffee',
	`category` varchar(80),
	`description` mediumtext,
	`story` mediumtext,
	`origin_region` varchar(120),
	`origin_farm` varchar(120),
	`producer` varchar(160),
	`altitude_m` int,
	`variety` varchar(120),
	`process` varchar(80),
	`roast_level` varchar(40),
	`profile` longtext,
	`tasting_notes` longtext,
	`brew_methods` longtext,
	`theme_color` varchar(9),
	`accent_color` varchar(9),
	`image_url` varchar(500),
	`gallery` longtext,
	`badges` longtext,
	`is_active` boolean NOT NULL DEFAULT true,
	`is_featured` boolean NOT NULL DEFAULT false,
	`is_seasonal` boolean NOT NULL DEFAULT false,
	`subscription_eligible` boolean NOT NULL DEFAULT false,
	`rating_avg` double NOT NULL DEFAULT 0,
	`rating_count` int NOT NULL DEFAULT 0,
	`sort_order` int NOT NULL DEFAULT 0,
	`seo_title` varchar(200),
	`seo_description` varchar(320),
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `products_id` PRIMARY KEY(`id`),
	CONSTRAINT `products_slug` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `push_campaigns` (
	`id` varchar(36) NOT NULL,
	`title` varchar(80) NOT NULL,
	`body` varchar(300) NOT NULL,
	`deep_link` varchar(300),
	`image_url` varchar(500),
	`audience` varchar(80) NOT NULL DEFAULT 'all',
	`platform` enum('all','ios','android') NOT NULL DEFAULT 'all',
	`status` enum('draft','scheduled','sending','sent','failed','cancelled') NOT NULL DEFAULT 'draft',
	`scheduled_at` datetime(3),
	`target_count` int NOT NULL DEFAULT 0,
	`sent_count` int NOT NULL DEFAULT 0,
	`error_count` int NOT NULL DEFAULT 0,
	`open_count` int NOT NULL DEFAULT 0,
	`created_by` varchar(36),
	`sent_at` datetime(3),
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `push_campaigns_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `push_deliveries` (
	`id` varchar(36) NOT NULL,
	`campaign_id` varchar(36),
	`user_id` varchar(36),
	`token` varchar(255),
	`trigger` varchar(40) NOT NULL DEFAULT 'campaign',
	`title` varchar(120) NOT NULL,
	`status` enum('ok','error') NOT NULL DEFAULT 'ok',
	`ticket_id` varchar(80),
	`error` varchar(300),
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `push_deliveries_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `push_tokens` (
	`token` varchar(255) NOT NULL,
	`user_id` varchar(36),
	`platform` enum('ios','android','web') NOT NULL,
	`app_version` varchar(20),
	`enabled` boolean NOT NULL DEFAULT true,
	`last_error` varchar(300),
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `push_tokens_token` PRIMARY KEY(`token`)
);
--> statement-breakpoint
CREATE TABLE `quiz_attempts` (
	`id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`quiz_id` varchar(36) NOT NULL,
	`score` int NOT NULL,
	`passed` boolean NOT NULL,
	`answers` longtext,
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `quiz_attempts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `quiz_questions` (
	`id` varchar(36) NOT NULL,
	`quiz_id` varchar(36) NOT NULL,
	`prompt` text NOT NULL,
	`options` longtext,
	`correct_index` int NOT NULL,
	`explanation` text,
	`position` int NOT NULL DEFAULT 0,
	CONSTRAINT `quiz_questions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `quizzes` (
	`id` varchar(36) NOT NULL,
	`course_id` varchar(36) NOT NULL,
	`module_id` varchar(36),
	`title` varchar(200) NOT NULL,
	`pass_score` int NOT NULL DEFAULT 70,
	`position` int NOT NULL DEFAULT 0,
	CONSTRAINT `quizzes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `rate_limits` (
	`key` varchar(191) NOT NULL,
	`count` int NOT NULL DEFAULT 0,
	`reset_at` datetime(3) NOT NULL,
	CONSTRAINT `rate_limits_key` PRIMARY KEY(`key`)
);
--> statement-breakpoint
CREATE TABLE `shipping_zones` (
	`id` varchar(36) NOT NULL,
	`name` varchar(120) NOT NULL,
	`regions` longtext,
	`cities` longtext,
	`rate_cop` int NOT NULL,
	`free_from_cop` int,
	`eta_days` varchar(40) NOT NULL DEFAULT '2-4 días hábiles',
	`is_default` boolean NOT NULL DEFAULT false,
	`sort_order` int NOT NULL DEFAULT 0,
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `shipping_zones_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `site_content` (
	`key` varchar(80) NOT NULL,
	`content` longtext,
	`updated_by` varchar(36),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `site_content_key` PRIMARY KEY(`key`)
);
--> statement-breakpoint
CREATE TABLE `stores` (
	`id` varchar(36) NOT NULL,
	`slug` varchar(120) NOT NULL,
	`name` varchar(160) NOT NULL,
	`kind` enum('cafe','finca','aliado') NOT NULL DEFAULT 'cafe',
	`address` varchar(300) NOT NULL,
	`city` varchar(120) NOT NULL,
	`hours` longtext,
	`phone` varchar(40),
	`map_url` varchar(500),
	`menu_url` varchar(500),
	`image_url` varchar(500),
	`description` text,
	`lat` double,
	`lng` double,
	`is_active` boolean NOT NULL DEFAULT true,
	`sort_order` int NOT NULL DEFAULT 0,
	CONSTRAINT `stores_id` PRIMARY KEY(`id`),
	CONSTRAINT `stores_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `subscription_charges` (
	`id` varchar(36) NOT NULL,
	`subscription_id` varchar(36) NOT NULL,
	`order_id` varchar(36),
	`amount_cop` int NOT NULL,
	`status` enum('pending','approved','declined','error') NOT NULL DEFAULT 'pending',
	`wompi_transaction_id` varchar(64),
	`attempt` int NOT NULL DEFAULT 1,
	`error` varchar(500),
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `subscription_charges_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `subscription_plans` (
	`id` varchar(36) NOT NULL,
	`slug` varchar(120) NOT NULL,
	`name` varchar(120) NOT NULL,
	`tagline` varchar(200),
	`description` text,
	`audience` enum('personal','empresa') NOT NULL DEFAULT 'personal',
	`frequency_weeks` int NOT NULL DEFAULT 4,
	`bags_per_delivery` int NOT NULL DEFAULT 1,
	`bag_weight_g` int NOT NULL DEFAULT 340,
	`price_cop` int NOT NULL,
	`compare_at_cop` int,
	`includes_academy` boolean NOT NULL DEFAULT false,
	`benefits` longtext,
	`image_url` varchar(500),
	`is_highlighted` boolean NOT NULL DEFAULT false,
	`is_active` boolean NOT NULL DEFAULT true,
	`sort_order` int NOT NULL DEFAULT 0,
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `subscription_plans_id` PRIMARY KEY(`id`),
	CONSTRAINT `plans_slug` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `subscriptions` (
	`id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`plan_id` varchar(36) NOT NULL,
	`product_id` varchar(36),
	`grind` varchar(40) NOT NULL DEFAULT 'grano',
	`status` enum('pending','active','paused','past_due','cancelled') NOT NULL DEFAULT 'pending',
	`price_cop` int NOT NULL,
	`address` longtext,
	`wompi_payment_source_id` varchar(64),
	`card_brand` varchar(30),
	`card_last4` varchar(4),
	`next_billing_at` datetime(3),
	`paused_until` datetime(3),
	`failed_attempts` int NOT NULL DEFAULT 0,
	`cancel_reason` varchar(300),
	`started_at` datetime(3),
	`cancelled_at` datetime(3),
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `subscriptions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` varchar(36) NOT NULL,
	`firebase_uid` varchar(128) NOT NULL,
	`email` varchar(191) NOT NULL,
	`email_verified` boolean NOT NULL DEFAULT false,
	`full_name` varchar(160),
	`phone` varchar(40),
	`avatar_url` varchar(500),
	`role` enum('customer','editor','admin') NOT NULL DEFAULT 'customer',
	`legal_id_type` enum('CC','CE','NIT','PP','TI'),
	`legal_id` varchar(40),
	`marketing_opt_in` boolean NOT NULL DEFAULT true,
	`loyalty_points` int NOT NULL DEFAULT 0,
	`provider` varchar(40),
	`last_seen_at` datetime(3),
	`disabled_at` datetime(3),
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_firebase_uid` UNIQUE(`firebase_uid`),
	CONSTRAINT `users_email` UNIQUE(`email`)
);
--> statement-breakpoint
CREATE INDEX `addresses_user` ON `addresses` (`user_id`);--> statement-breakpoint
CREATE INDEX `audit_entity` ON `audit_log` (`entity`,`entity_id`);--> statement-breakpoint
CREATE INDEX `audit_date` ON `audit_log` (`created_at`);--> statement-breakpoint
CREATE INDEX `posts_status` ON `blog_posts` (`status`,`published_at`);--> statement-breakpoint
CREATE INDEX `carts_updated` ON `carts` (`updated_at`);--> statement-breakpoint
CREATE INDEX `chat_msgs_session` ON `chat_messages` (`session_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `chat_status` ON `chat_sessions` (`status`,`created_at`);--> statement-breakpoint
CREATE INDEX `chat_visitor` ON `chat_sessions` (`visitor_id`);--> statement-breakpoint
CREATE INDEX `redemptions_coupon` ON `coupon_redemptions` (`coupon_id`,`email`);--> statement-breakpoint
CREATE INDEX `modules_course` ON `course_modules` (`course_id`,`position`);--> statement-breakpoint
CREATE INDEX `courses_pub` ON `courses` (`is_published`,`sort_order`);--> statement-breakpoint
CREATE INDEX `enroll_course` ON `enrollments` (`course_id`);--> statement-breakpoint
CREATE INDEX `events_source_date` ON `integration_events` (`source`,`created_at`);--> statement-breakpoint
CREATE INDEX `events_status_date` ON `integration_events` (`status`,`created_at`);--> statement-breakpoint
CREATE INDEX `leads_status` ON `leads` (`status`,`created_at`);--> statement-breakpoint
CREATE INDEX `notes_user_lesson` ON `lesson_notes` (`user_id`,`lesson_id`);--> statement-breakpoint
CREATE INDEX `progress_course` ON `lesson_progress` (`user_id`,`course_id`);--> statement-breakpoint
CREATE INDEX `lessons_module` ON `lessons` (`module_id`,`position`);--> statement-breakpoint
CREATE INDEX `lessons_course` ON `lessons` (`course_id`);--> statement-breakpoint
CREATE INDEX `loyalty_user` ON `loyalty_ledger` (`user_id`);--> statement-breakpoint
CREATE INDEX `media_folder` ON `media_assets` (`folder`);--> statement-breakpoint
CREATE INDEX `notif_user` ON `notifications` (`user_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `items_order` ON `order_items` (`order_id`);--> statement-breakpoint
CREATE INDEX `items_product` ON `order_items` (`product_id`);--> statement-breakpoint
CREATE INDEX `items_course` ON `order_items` (`course_id`);--> statement-breakpoint
CREATE INDEX `orders_user` ON `orders` (`user_id`);--> statement-breakpoint
CREATE INDEX `orders_email` ON `orders` (`email`);--> statement-breakpoint
CREATE INDEX `orders_status_date` ON `orders` (`status`,`created_at`);--> statement-breakpoint
CREATE INDEX `orders_paid_at` ON `orders` (`paid_at`);--> statement-breakpoint
CREATE INDEX `payment_events_ref` ON `payment_events` (`reference`);--> statement-breakpoint
CREATE INDEX `reviews_product` ON `product_reviews` (`product_id`,`status`);--> statement-breakpoint
CREATE INDEX `reviews_course` ON `product_reviews` (`course_id`,`status`);--> statement-breakpoint
CREATE INDEX `variants_product` ON `product_variants` (`product_id`);--> statement-breakpoint
CREATE INDEX `products_active` ON `products` (`is_active`,`kind`,`sort_order`);--> statement-breakpoint
CREATE INDEX `campaign_status` ON `push_campaigns` (`status`,`scheduled_at`);--> statement-breakpoint
CREATE INDEX `deliveries_date` ON `push_deliveries` (`created_at`);--> statement-breakpoint
CREATE INDEX `deliveries_campaign` ON `push_deliveries` (`campaign_id`);--> statement-breakpoint
CREATE INDEX `push_user` ON `push_tokens` (`user_id`);--> statement-breakpoint
CREATE INDEX `attempts_user_quiz` ON `quiz_attempts` (`user_id`,`quiz_id`);--> statement-breakpoint
CREATE INDEX `questions_quiz` ON `quiz_questions` (`quiz_id`,`position`);--> statement-breakpoint
CREATE INDEX `quizzes_course` ON `quizzes` (`course_id`);--> statement-breakpoint
CREATE INDEX `charges_sub` ON `subscription_charges` (`subscription_id`);--> statement-breakpoint
CREATE INDEX `subs_user` ON `subscriptions` (`user_id`);--> statement-breakpoint
CREATE INDEX `subs_billing` ON `subscriptions` (`status`,`next_billing_at`);--> statement-breakpoint
CREATE INDEX `users_role` ON `users` (`role`);