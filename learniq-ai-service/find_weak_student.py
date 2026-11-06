"""
Quick utility: scan the sample data to find a student+topic where
accuracy is UNEVEN across subtopics - a good real example of a
"specific" weakness (not just failing everything).
"""

import csv
from collections import defaultdict

DATA_PATH = "data/quiz_attempts_sample.csv"

with open(DATA_PATH, newline="", encoding="utf-8") as f:
    reader = csv.DictReader(f)
    attempts = list(reader)

# Group by (student, topic, subtopic)
groups = defaultdict(list)
for row in attempts:
    key = (row["student_id"], row["topic"], row["subtopic"])
    groups[key].append(row)

# Now group subtopic accuracies under each (student, topic)
student_topic_subtopics = defaultdict(dict)
for (student, topic, subtopic), rows in groups.items():
    total = len(rows)
    correct = sum(1 for r in rows if r["is_correct"] == "1")
    accuracy = correct / total
    student_topic_subtopics[(student, topic)][subtopic] = (accuracy, total)

# Find cases with at least 2 subtopics and a big accuracy GAP between them
candidates = []
for (student, topic), subtopics in student_topic_subtopics.items():
    if len(subtopics) < 2:
        continue
    accuracies = [acc for acc, _ in subtopics.values()]
    gap = max(accuracies) - min(accuracies)
    candidates.append((student, topic, gap, subtopics))

candidates.sort(key=lambda x: x[2], reverse=True)  # biggest gap first

print("5 best examples of UNEVEN subtopic performance:\n")
for student, topic, gap, subtopics in candidates[:5]:
    print(f"{student} - {topic} (gap: {gap*100:.0f}%)")
    for subtopic, (acc, total) in subtopics.items():
        print(f"    {subtopic}: {acc*100:.0f}% ({total} attempts)")
    print()