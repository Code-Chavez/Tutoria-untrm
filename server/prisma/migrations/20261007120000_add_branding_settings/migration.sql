-- CreateTable
CREATE TABLE "branding_settings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "institution_name" TEXT NOT NULL,
    "short_name" TEXT NOT NULL,
    "primary_color" TEXT NOT NULL,
    "accent_color" TEXT NOT NULL,
    "logo_storage_key" TEXT,
    "logo_mime_type" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "branding_settings_pkey" PRIMARY KEY ("id")
);
