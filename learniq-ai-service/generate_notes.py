
import os
import time
from dotenv import load_dotenv
from google import genai

from extract_pdf_text import extract_text
from clean_pdf_text import clean_text
from split_sections import split_into_sections

load_dotenv()

PDF_PATH = "sample_pdfs/Unit 3.pdf"

client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))


def generate_notes_for_topic(topic_name, topic_text):
    prompt = f"""You are creating study notes for a student, based STRICTLY on
the text provided below. Do NOT add any information that isn't in the text.

Topic: {topic_name}

Source text:
\"\"\"
{topic_text}
\"\"\"

Create notes in this exact format:

Quick Summary: (1-2 sentences)

Key Points:
- (bullet point)
- (bullet point)
- (bullet point)
"""

    response = client.models.generate_content(
        model="gemini-3.6-flash",
        contents=prompt,
    )
    return response.text


if __name__ == "__main__":
    raw = extract_text(PDF_PATH)
    cleaned = clean_text(raw)
    sections = split_into_sections(cleaned)

    print(f"Generating notes for {len(sections)} topics...\n")

    all_notes = {}
    for i, (topic_name, topic_text) in enumerate(sections.items()):
        print(f"Processing ({i+1}/{len(sections)}): {topic_name}...")
        notes = generate_notes_for_topic(topic_name, topic_text)
        all_notes[topic_name] = notes

        # Free tier allows only 5 requests/minute - wait between calls
        # to stay safely under that limit
        time.sleep(13)

    print("\n" + "=" * 50)
    print("DONE. Sample output for first 2 topics:\n")
    for topic_name in list(all_notes.keys())[:2]:
        print(f"=== {topic_name} ===")
        print(all_notes[topic_name])
        print()