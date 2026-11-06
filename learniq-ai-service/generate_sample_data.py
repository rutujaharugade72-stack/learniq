"""
LEARNIQ - Sample Dataset Generator (Phase 2)

Generates a clearly-labeled SAMPLE dataset that mimics real student quiz
attempts. This is NOT real data - it's synthetic data built to have
realistic patterns (some students genuinely weak in some topics, etc.)
so Phase 3's ML model has something meaningful to learn from.

Run this once to create data/quiz_attempts_sample.csv
"""

import csv
import random

random.seed(42)  # reproducible - same output every time we run this

OUTPUT_PATH = "data/quiz_attempts_sample.csv"

STUDENTS = [f"S{str(i).zfill(3)}" for i in range(1, 21)]  # S001 ... S020

TOPICS = {
    "Recursion": ["Base Cases", "Recursive Calls", "Stack Overflow"],
    "Machine Learning": ["Supervised Learning", "Unsupervised Learning", "Model Evaluation"],
    "Data Structures": ["Arrays", "Linked Lists", "Trees"],
    "Python Basics": ["Loops", "Functions", "Data Types"],
    "Decision Trees": ["Entropy", "Information Gain", "Overfitting"],
}

DIFFICULTIES = ["Easy", "Medium", "Hard"]

# Each student gets a hidden "skill level" per topic (0.0 to 1.0) that
# influences their chance of getting a question right. This is what
# creates realistic patterns for the ML model to discover later.
def build_student_skills():
    skills = {}
    for student in STUDENTS:
        skills[student] = {topic: round(random.uniform(0.2, 0.95), 2) for topic in TOPICS}
    return skills


def simulate_attempt(student, topic, subtopic, difficulty, skill_level, attempt_number):
    difficulty_penalty = {"Easy": 0.0, "Medium": 0.15, "Hard": 0.3}[difficulty]
    correct_probability = max(0.05, skill_level - difficulty_penalty)
    is_correct = 1 if random.random() < correct_probability else 0

    base_time = {"Easy": 20, "Medium": 40, "Hard": 65}[difficulty]
    time_taken = max(5, int(random.gauss(base_time, base_time * 0.3)))

    hints_used = 0 if is_correct and random.random() > 0.3 else random.choice([0, 0, 1, 1, 2])

    return {
        "student_id": student,
        "topic": topic,
        "subtopic": subtopic,
        "difficulty": difficulty,
        "is_correct": is_correct,
        "time_taken_seconds": time_taken,
        "attempt_number": attempt_number,
        "hints_used": hints_used,
    }


def generate_dataset():
    skills = build_student_skills()
    rows = []

    for student in STUDENTS:
        for topic, subtopics in TOPICS.items():
            skill_level = skills[student][topic]
            # each student attempts a handful of questions per topic
            num_attempts = random.randint(3, 6)
            for attempt_number in range(1, num_attempts + 1):
                subtopic = random.choice(subtopics)
                difficulty = random.choice(DIFFICULTIES)
                row = simulate_attempt(
                    student, topic, subtopic, difficulty, skill_level, attempt_number
                )
                rows.append(row)

    return rows


def save_csv(rows, path):
    fieldnames = [
        "student_id", "topic", "subtopic", "difficulty",
        "is_correct", "time_taken_seconds", "attempt_number", "hints_used",
    ]
    with open(path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)


if __name__ == "__main__":
    data = generate_dataset()
    save_csv(data, OUTPUT_PATH)
    print(f"Generated {len(data)} rows -> {OUTPUT_PATH}")