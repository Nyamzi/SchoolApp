/*
  Warnings:

  - You are about to drop the column `marking_guide` on the `TeacherSubject` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Exam" ADD COLUMN "exam_file_name" TEXT;
ALTER TABLE "Exam" ADD COLUMN "exam_file_path" TEXT;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_TeacherSubject" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "teacher_id" INTEGER NOT NULL,
    "subject_id" INTEGER NOT NULL,
    "study_notes" TEXT,
    "notes_file_path" TEXT,
    "notes_file_name" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TeacherSubject_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "TeacherSubject_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "Subject" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_TeacherSubject" ("created_at", "id", "study_notes", "subject_id", "teacher_id") SELECT "created_at", "id", "study_notes", "subject_id", "teacher_id" FROM "TeacherSubject";
DROP TABLE "TeacherSubject";
ALTER TABLE "new_TeacherSubject" RENAME TO "TeacherSubject";
CREATE UNIQUE INDEX "TeacherSubject_teacher_id_subject_id_key" ON "TeacherSubject"("teacher_id", "subject_id");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
