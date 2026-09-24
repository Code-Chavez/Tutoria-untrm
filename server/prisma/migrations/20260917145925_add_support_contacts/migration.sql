-- CreateTable
CREATE TABLE "support_contacts" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "student_id" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "relationship" TEXT NOT NULL,
    "age" INTEGER,
    "occupation" TEXT,
    "phone" TEXT NOT NULL,

    CONSTRAINT "support_contacts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "support_contacts_student_id_key" ON "support_contacts"("student_id");

-- AddForeignKey
ALTER TABLE "support_contacts" ADD CONSTRAINT "support_contacts_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
