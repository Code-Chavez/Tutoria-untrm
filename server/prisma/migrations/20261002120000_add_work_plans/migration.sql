-- CreateTable
CREATE TABLE "work_plans" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "period_id" TEXT NOT NULL,
    "school_id" TEXT NOT NULL,
    "author_id" TEXT NOT NULL,
    "introduction" TEXT NOT NULL,
    "denomination" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "execution_date" TEXT NOT NULL,
    "schedule" TEXT NOT NULL,
    "place" TEXT NOT NULL,
    "modality" TEXT NOT NULL,
    "organizers" TEXT NOT NULL,
    "support_unit" TEXT NOT NULL,
    "foundation" TEXT NOT NULL,
    "general_objective" TEXT NOT NULL,
    "specific_objectives" TEXT[],
    "target_audience" TEXT NOT NULL,
    "methodology" TEXT NOT NULL,
    "planning" JSONB NOT NULL,
    "programming" JSONB NOT NULL,
    "physical_resources" JSONB NOT NULL,
    "human_resources" JSONB NOT NULL,
    "budget" JSONB NOT NULL,
    "operational_activities" JSONB NOT NULL,

    CONSTRAINT "work_plans_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "work_plans_period_id_school_id_key" ON "work_plans"("period_id", "school_id");

-- AddForeignKey
ALTER TABLE "work_plans" ADD CONSTRAINT "work_plans_period_id_fkey" FOREIGN KEY ("period_id") REFERENCES "academic_periods"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_plans" ADD CONSTRAINT "work_plans_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_plans" ADD CONSTRAINT "work_plans_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
