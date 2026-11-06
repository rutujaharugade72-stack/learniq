CAREERS = {
    "ML Engineer": [
        "python", "machine learning", "deep learning", "statistics",
        "data structures", "model deployment", "tensorflow",
    ],
    "Data Analyst": [
        "python", "sql", "statistics", "data visualization",
        "excel", "data cleaning",
    ],
    "Data Scientist": [
        "python", "statistics", "machine learning", "sql",
        "data visualization", "experimentation",
    ],
    "Backend Developer": [
        "python", "node.js", "databases", "api design",
        "system design", "data structures",
    ],
    "Frontend Developer": [
        "javascript", "react", "html", "css", "ui design", "api design",
    ],
    "DevOps Engineer": [
        "linux", "docker", "kubernetes", "ci/cd", "cloud computing", "networking",
    ],
}


if __name__ == "__main__":
    for career, skills in CAREERS.items():
        print(f"{career}: {', '.join(skills)}")