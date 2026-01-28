import json
from typing import Any, Dict

import httpx

from config import settings


PROMPT_TEMPLATE = """You are an AI grading assistant. Grade the student's answer based on the model answer,
key points, and rubric. Use semantic understanding, not exact keyword matching. Only suggest marks.

Evaluation rules:
- Treat paraphrases and synonyms as correct if the meaning matches.
- Use the model answer and key points as the source of truth, even if the question is phrased differently.
- Award partial marks when only some key points are present.
- If the answer is off-topic or contradicts the model answer, award low marks.
- Keep feedback short and specific.

Return ONLY valid JSON with this exact schema:
{
  "awarded_marks": number,
  "max_marks": number,
  "matched_key_points": [],
  "missing_key_points": [],
  "feedback": string,
  "confidence": number
}

Question: {question_text}
Model Answer: {model_answer}
Key Points: {key_points}
Rubric: {rubric}
Total Marks: {total_marks}
Student Answer: {student_answer}
"""


def _mock_grade(max_marks: float) -> Dict[str, Any]:
    return {
        "awarded_marks": 0.0,
        "max_marks": max_marks,
        "matched_key_points": [],
        "missing_key_points": [],
        "feedback": "AI grading is not configured. This is a mock response.",
        "confidence": 0.1,
    }


def grade_answer(
    question_text: str,
    model_answer: str,
    key_points: list[str],
    rubric: dict[str, str],
    total_marks: float,
    student_answer: str,
    answer_image_base64: str | None = None,
    marking_guide: str = "",
    study_notes: str = "",
) -> Dict[str, Any]:
    if settings.ai_mock:
        return _mock_grade(total_marks)
    if not settings.openai_api_key:
        raise RuntimeError("OPENAI_API_KEY is not configured.")

    prompt = PROMPT_TEMPLATE.format(
        question_text=question_text,
        model_answer=model_answer,
        key_points=json.dumps(key_points),
        rubric=json.dumps(rubric),
        total_marks=total_marks,
        student_answer=student_answer,
    )
    if study_notes:
        prompt += f"\nStudy Notes: {study_notes}"

    headers = {"Authorization": f"Bearer {settings.openai_api_key}"}
    if answer_image_base64:
        payload = {
            "model": settings.openai_model,
            "messages": [
                {
                    "role": "system",
                    "content": "You are a strict JSON-only grader. Compare answers semantically and award partial credit.",
                },
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": prompt},
                        {"type": "image_url", "image_url": {"url": answer_image_base64}},
                    ],
                },
            ],
            "temperature": 0.2,
            "response_format": {"type": "json_object"},
        }
    else:
        payload = {
            "model": settings.openai_model,
            "messages": [
                {
                    "role": "system",
                    "content": "You are a strict JSON-only grader. Compare answers semantically and award partial credit.",
                },
                {"role": "user", "content": prompt},
            ],
            "temperature": 0.2,
            "response_format": {"type": "json_object"},
        }

    with httpx.Client(timeout=30) as client:
        response = client.post(f"{settings.openai_api_base}/chat/completions", json=payload, headers=headers)
        response.raise_for_status()
        data = response.json()

    content = data["choices"][0]["message"]["content"]
    try:
        result = json.loads(content)
    except json.JSONDecodeError as exc:
        raise RuntimeError(f"Invalid JSON from AI: {content}") from exc

    return _normalize_result(result, total_marks)


def _normalize_result(result: Dict[str, Any], max_marks: float) -> Dict[str, Any]:
    return {
        "awarded_marks": float(result.get("awarded_marks", 0)),
        "max_marks": float(result.get("max_marks", max_marks)),
        "matched_key_points": list(result.get("matched_key_points", [])),
        "missing_key_points": list(result.get("missing_key_points", [])),
        "feedback": str(result.get("feedback", "")),
        "confidence": float(result.get("confidence", 0)),
    }
