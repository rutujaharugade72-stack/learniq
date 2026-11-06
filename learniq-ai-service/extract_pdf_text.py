import fitz  # PyMuPDF
import os

PDF_PATH = "sample_pdfs/Unit 3.pdf"


def extract_text(pdf_path):
    if not os.path.exists(pdf_path):
        raise FileNotFoundError(f"PDF not found at: {pdf_path}")

    doc = fitz.open(pdf_path)

    full_text = ""
    for page_num, page in enumerate(doc, start=1):
        page_text = page.get_text()
        full_text += f"\n--- Page {page_num} ---\n{page_text}"

    doc.close()
    return full_text


if __name__ == "__main__":
    text = extract_text(PDF_PATH)

    print(f"Extracted {len(text)} characters from {PDF_PATH}")
    print()
    print("First 1000 characters preview:")
    print("-" * 50)
    print(text[:1000])