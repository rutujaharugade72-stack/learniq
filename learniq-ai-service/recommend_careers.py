from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

from careers_data import CAREERS


def skills_to_text(skills):
    """Turn a list of skills into a single space-joined string for TF-IDF."""
    return " ".join(skill.replace(" ", "_") for skill in skills)


def recommend_careers(student_skills, top_n=3):
    career_names = list(CAREERS.keys())
    career_texts = [skills_to_text(CAREERS[name]) for name in career_names]
    student_text = skills_to_text(student_skills)

    # Fit TF-IDF on careers + the student's profile together, so they
    # share the same vocabulary/vector space and can be compared fairly.
    documents = career_texts + [student_text]

    vectorizer = TfidfVectorizer()
    tfidf_matrix = vectorizer.fit_transform(documents)

    student_vector = tfidf_matrix[-1]        # last row = student
    career_vectors = tfidf_matrix[:-1]        # all rows before it = careers

    similarities = cosine_similarity(student_vector, career_vectors)[0]

    results = list(zip(career_names, similarities))
    results.sort(key=lambda x: x[1], reverse=True)

    return results[:top_n]


if __name__ == "__main__":
    # Example student profile - swap this out to test different students
    student_skills = ["python", "statistics", "machine learning", "data structures"]

    print(f"Student skills: {', '.join(student_skills)}")
    print()
    print("Top career matches:")

    for career, score in recommend_careers(student_skills):
        print(f"  {career} — {score * 100:.1f}%")