from extract_pdf_text import extract_text
from clean_pdf_text import clean_text
from detect_topics import extract_topic_outline, is_likely_heading

PDF_PATH = "sample_pdfs/Unit 3.pdf"

MIN_SECTION_LENGTH = 40  # characters - sections shorter than this are dropped as noise


def split_into_sections(cleaned_text):
    lines = cleaned_text.split("\n")
    sections = {}
    current_heading = "Introduction"
    current_content = []

    for line in lines:
        line = line.strip()
        if not line:
            continue

        if is_likely_heading(line):
            if current_content:
                sections[current_heading] = " ".join(current_content).strip()
            current_heading = line
            current_content = []
        else:
            current_content.append(line)

    if current_content:
        sections[current_heading] = " ".join(current_content).strip()

    # Filter out sections with too little real content to be useful
    meaningful_sections = {
        heading: content
        for heading, content in sections.items()
        if len(content) >= MIN_SECTION_LENGTH
    }

    return meaningful_sections


if __name__ == "__main__":
    raw = extract_text(PDF_PATH)
    cleaned = clean_text(raw)

    sections = split_into_sections(cleaned)

    print(f"Split into {len(sections)} meaningful sections (filtered out short/junk ones).\n")
    for heading in sections.keys():
        print(f"  - {heading} ({len(sections[heading])} chars)")