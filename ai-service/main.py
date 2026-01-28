from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

from ai_grading import grade_answer


class GradeRequest(BaseModel):
    question_text: str
    model_answer: str
    key_points: list[str]
    rubric: dict
    total_marks: float
    student_answer: str | None = None
    answer_image_base64: str | None = None
    marking_guide: str | None = None
    study_notes: str | None = None


app = FastAPI(title="AI Grading Service")


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/grade")
def grade(payload: GradeRequest):
    try:
        return grade_answer(
            question_text=payload.question_text,
            model_answer=payload.model_answer,
            key_points=payload.key_points,
            rubric=payload.rubric,
            total_marks=payload.total_marks,
            student_answer=payload.student_answer or "",
            answer_image_base64=payload.answer_image_base64,
            marking_guide=payload.marking_guide or "",
            study_notes=payload.study_notes or "",
        )
    except RuntimeError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
