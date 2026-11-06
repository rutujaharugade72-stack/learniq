import os
from dotenv import load_dotenv
from google import genai

load_dotenv()

client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

STYLE_PROMPTS = {
    "beginner": "Explain this like the student has zero prior knowledge. Use very simple language and a relatable analogy.",
    "example": "Explain this concept primarily through a clear, concrete real-world example.",
    "exam": "Explain this in a formal, precise way suitable for writing in an exam answer, including key terms.",
    "revision": "Give a very short, high-level revision summary - just the core idea in 2-3 sentences.",
}


def explain_topic(topic_name, topic_text, style="beginner"):
    style_instruction = STYLE_PROMPTS.get(style, STYLE_PROMPTS["beginner"])

    prompt = f"""You are an AI teacher helping a student understand a topic,
based STRICTLY on the text provided below. Do NOT add information that
isn't in the text.

Topic: {topic_name}

Source text:
\"\"\"
{topic_text}
\"\"\"

Instruction: {style_instruction}
"""

    response = client.models.generate_content(
        model="gemini-3.6-flash",
        contents=prompt,
    )
    return response.text


def answer_followup(topic_name, topic_text, previous_explanation, student_question):
    prompt = f"""You are an AI teacher. You already explained a topic to a
student, and they have a follow-up question. Answer STRICTLY based on the
source text below - do not invent information.

Topic: {topic_name}

Source text:
\"\"\"
{topic_text}
\"\"\"

Your previous explanation:
\"\"\"
{previous_explanation}
\"\"\"

Student's follow-up question: {student_question}
"""

    response = client.models.generate_content(
        model="gemini-3.6-flash",
        contents=prompt,
    )
    return response.text


if __name__ == "__main__":
    topic_name = "Black Box Testing"
    topic_text = (
        "Black-box testing is a Type of Software Testing in which the tester "
        "is not concerned with the software's internal knowledge or "
        "implementation details but rather focuses on validating the "
        "functionality based on the provided specifications or requirements."
    )

    explanation = explain_topic(topic_name, topic_text, style="beginner")
    print("EXPLANATION (beginner style):")
    print(explanation)