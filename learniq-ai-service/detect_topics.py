
import re
from extract_pdf_text import extract_text
from clean_pdf_text import clean_text

PDF_PATH = "sample_pdfs/Unit 3.pdf"


def is_likely_heading(line):
    line = line.strip()

    if not line:
        return False

    word_count = len(line.split())

    if word_count == 1 and not line.endswith(":"):
        return False

    if word_count > 8:
        return False

    if line.endswith("."):
        return False

    if re.match(r"^\d+[\.\)]\s", line):
        return True

    words = line.split()
    capitalized_words = sum(1 for w in words if w[:1].isupper())
    if len(words) > 0 and capitalized_words / len(words) >= 0.6:
        return True

    return False


def extract_topic_outline(text):
    lines = text.split("\n")
    headings = []
    seen = set()

    for line in lines:
        line = line.strip()
        if is_likely_heading(line) and line not in seen:
            headings.append(line)
            seen.add(line)

    return headings


if __name__ == "__main__":
    raw = extract_text(PDF_PATH)
    cleaned = clean_text(raw)

    headings = extract_topic_outline(cleaned)

    print(f"Detected {len(headings)} likely headings/topics:\n")
    for h in headings:
        print(f"  - {h}")