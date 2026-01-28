-- AlterTable
ALTER TABLE "TeacherSubject" ADD COLUMN "marking_guide" TEXT;
ALTER TABLE "TeacherSubject" ADD COLUMN "study_notes" TEXT;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_StudentAnswer" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "question_id" INTEGER NOT NULL,
    "student_name" TEXT NOT NULL,
    "student_user_id" INTEGER,
    "answer_text" TEXT,
    "answer_file_path" TEXT,
    "answer_file_name" TEXT,
    "submitted_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StudentAnswer_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "Question" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_StudentAnswer" ("answer_text", "id", "question_id", "student_name", "student_user_id", "submitted_at") SELECT "answer_text", "id", "question_id", "student_name", "student_user_id", "submitted_at" FROM "StudentAnswer";
DROP TABLE "StudentAnswer";
ALTER TABLE "new_StudentAnswer" RENAME TO "StudentAnswer";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
