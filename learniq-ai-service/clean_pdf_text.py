"""
LEARNIQ - Phase 6, Step 2: Clean Extracted PDF Text

Raw text pulled from a PDF is often messy: extra spaces between
letters, inconsistent line breaks, bullet characters, etc. This step
normalizes it into clean, readable text before we try to detect
topic/heading structure in Step 3.
"""

import re
from extract_pdf_text import extract_text

PDF_PATH = "sample_pdfs/Unit 3.pdf"


def clean_text(raw_text):
    text = raw_text

    # Remove our own page markers (we'll re-add page tracking properly later)
    text = re.sub(r"--- Page \d+ ---", "", text)

    # Collapse weird letter-spacing like "t e s t e r" -> "tester"
    # (only applies to sequences of single letters separated by spaces)
    text = re.sub(r"\b(?:[a-zA-Z]\s){2,}[a-zA-Z]\b", lambda m: m.group(0).replace(" ", ""), text)

    # Normalize bullet characters to a consistent "- "
    text = re.sub(r"[•●▪‣]", "-", text)

    # Collapse multiple blank lines into one
    text = re.sub(r"\n\s*\n+", "\n\n", text)

    # Collapse multiple spaces into one
    text = re.sub(r"[ \t]+", " ", text)

    # Trim leading/trailing whitespace on each line
    lines = [line.strip() for line in text.split("\n")]
    text = "\n".join(lines)

    return text.strip()


if __name__ == "__main__":
    raw = extract_text(PDF_PATH)
    cleaned = clean_text(raw)

    print(f"Raw length: {len(raw)} characters")
    print(f"Cleaned length: {len(cleaned)} characters")
    print()
    print("Cleaned preview (first 1000 characters):")
    print("-" * 50)
    print(cleaned[:1000])