import csv
from collections import defaultdict

INPUT_PATH = "data/quiz_attempts_sample.csv"
OUTPUT_PATH = "data/student_topic_features.csv"


def load_attempts(path):
    with open(path, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        return list(reader)


def group_by_student_topic(attempts):
    groups = defaultdict(list)
    for row in attempts:
        key = (row["student_id"], row["topic"])
        groups[key].append(row)
    return groups


def accuracy_of(rows):
    if not rows:
        return None
    correct = sum(1 for r in rows if r["is_correct"] == "1")
    return correct / len(rows)


def compute_trend(rows):
    """Second-half accuracy minus first-half accuracy, ordered by attempt_number."""
    rows_sorted = sorted(rows, key=lambda r: int(r["attempt_number"]))
    mid = len(rows_sorted) // 2
    if mid == 0:
        return 0.0
    first_half_acc = accuracy_of(rows_sorted[:mid])
    second_half_acc = accuracy_of(rows_sorted[mid:])
    if first_half_acc is None or second_half_acc is None:
        return 0.0
    return round(second_half_acc - first_half_acc, 3)


def compute_hard_accuracy(rows):
    hard_rows = [r for r in rows if r["difficulty"] == "Hard"]
    acc = accuracy_of(hard_rows)
    return round(acc, 3) if acc is not None else -1.0  # -1.0 = "no hard attempts"


def summarize(key, rows):
    student_id, topic = key
    total = len(rows)
    correct = sum(1 for r in rows if r["is_correct"] == "1")
    accuracy = round(correct / total, 3)

    avg_time = round(sum(int(r["time_taken_seconds"]) for r in rows) / total, 1)
    avg_hints = round(sum(int(r["hints_used"]) for r in rows) / total, 2)

    return {
        "student_id": student_id,
        "topic": topic,
        "num_attempts": total,
        "accuracy": accuracy,
        "avg_time_taken": avg_time,
        "avg_hints_used": avg_hints,
        "accuracy_trend": compute_trend(rows),
        "hard_accuracy": compute_hard_accuracy(rows),
    }


def save_csv(rows, path):
    fieldnames = [
        "student_id", "topic", "num_attempts", "accuracy",
        "avg_time_taken", "avg_hints_used", "accuracy_trend", "hard_accuracy",
    ]
    with open(path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)


if __name__ == "__main__":
    attempts = load_attempts(INPUT_PATH)
    groups = group_by_student_topic(attempts)

    features = [summarize(key, rows) for key, rows in groups.items()]

    save_csv(features, OUTPUT_PATH)
    print(f"Built {len(features)} student-topic feature rows -> {OUTPUT_PATH}")