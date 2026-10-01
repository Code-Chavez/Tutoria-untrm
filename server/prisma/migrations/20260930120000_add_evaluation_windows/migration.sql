-- CreateTable
CREATE TABLE "evaluation_windows" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "period_id" TEXT NOT NULL,
    "school_id" TEXT NOT NULL,
    "is_open" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "evaluation_windows_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "evaluation_windows_period_id_school_id_key" ON "evaluation_windows"("period_id", "school_id");

-- AddForeignKey
ALTER TABLE "evaluation_windows" ADD CONSTRAINT "evaluation_windows_period_id_fkey" FOREIGN KEY ("period_id") REFERENCES "academic_periods"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluation_windows" ADD CONSTRAINT "evaluation_windows_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
