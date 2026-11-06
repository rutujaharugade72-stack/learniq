"""
LEARNIQ - Why Am I Stuck? Engine

Step 1: Analyze subtopic-level patterns (data analysis)
Step 2: Generate a probable-weakness statement (rule-based reasoning)
Step 3: Guess the likely TYPE of problem from time and hints (rule-based)
Step 4: Track improvement over time (older attempts vs newer attempts)
Step 5: Build a recovery plan structure

No LLM used here - this is explainable rule-based analysis. A trained
model comes later, once there is enough real student data.
"""

import csv
from collections import defaultdict

DATA_PATH = "data/quiz_attempts_sample.csv"

# Thresholds used for reasoning - documented and explainable
WEAK_THRESHOLD = 0.5       # below this accuracy = "struggling"
STRONG_THRESHOLD = 0.75    # above this accuracy = "doing fine"
MIN_ATTEMPTS_TO_TRUST = 2  # need at least this many attempts to draw a conclusion

# Time and hints rules (compared with the student's OWN average)
SLOW_FACTOR = 1.3               # slower than 1.3x own average = "slow"
FAST_FACTOR = 0.8               # faster than 0.8x own average = "fast"
HINT_LIMIT = 0.5                # average hints per question at or above this = "needs hints"
MAX_SECONDS_PER_ATTEMPT = 300   # ignore extreme times (student left the tab open)
MIN_ATTEMPTS_FOR_BASELINE = 5   # need this many timed attempts to trust the average

# Improvement tracking: compare the older half of attempts with the newer half
MIN_ATTEMPTS_FOR_TREND = 4      # need at least 4 attempts on a subtopic
TREND_CHANGE = 0.2              # a change of 20 percentage points or more counts as real


def load_attempts(path):
    with open(path, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        return list(reader)


def get_student_topic_attempts(attempts, student_id, topic):
    return [
        row for row in attempts
        if row["student_id"] == student_id and row["topic"] == topic
    ]


def _seconds(row):
    """Time taken for one attempt, safe against missing or bad values."""
    try:
        value = float(row.get("time_taken_seconds") or 0)
    except (TypeError, ValueError):
        return 0.0
    return min(max(value, 0.0), MAX_SECONDS_PER_ATTEMPT)


def compute_baseline_seconds(rows):
    """The student's average seconds per question across ALL their attempts."""
    times = [_seconds(r) for r in rows if _seconds(r) > 0]
    if len(times) < MIN_ATTEMPTS_FOR_BASELINE:
        return None
    return sum(times) / len(times)


def compute_trend(rows):
    """
    Improvement tracking for ONE subtopic. The rows must be in time order
    (oldest first). Compares the older half with the newer half.
    Returns {} when there are too few attempts (no guess is better than a wrong one).
    """
    total = len(rows)
    if total < MIN_ATTEMPTS_FOR_TREND:
        return {}

    half = total // 2
    older = rows[:half]
    newer = rows[half:]

    def accuracy(part):
        return sum(1 for r in part if r["is_correct"] == "1") / len(part)

    then_accuracy = round(accuracy(older), 3)
    now_accuracy = round(accuracy(newer), 3)
    change = now_accuracy - then_accuracy

    if change >= TREND_CHANGE:
        trend = "improved"
    elif change <= -TREND_CHANGE:
        trend = "dropped"
    else:
        trend = "steady"

    return {
        "then_accuracy": then_accuracy,
        "now_accuracy": now_accuracy,
        "trend": trend,
    }


def analyze_by_subtopic(attempts):
    subtopic_groups = defaultdict(list)
    for row in attempts:
        subtopic_groups[row["subtopic"]].append(row)

    results = []
    for subtopic, rows in subtopic_groups.items():
        total = len(rows)
        correct = sum(1 for r in rows if r["is_correct"] == "1")
        accuracy = round(correct / total, 3) if total > 0 else 0
        avg_hints = round(sum(int(r["hints_used"]) for r in rows) / total, 2)
        avg_time = round(sum(_seconds(r) for r in rows) / total, 1)

        results.append({
            "subtopic": subtopic,
            "attempts": total,
            "accuracy": accuracy,
            "avg_hints_used": avg_hints,
            "avg_time_seconds": avg_time,
            **compute_trend(rows),
        })

    results.sort(key=lambda x: x["accuracy"])
    return results


def build_insight(stats, baseline_seconds):
    """
    Rule-based guess of the TYPE of problem for one subtopic.
    Returns {} when there is no clear signal (honest: no guess is better
    than a wrong one).
    """
    if stats["attempts"] < MIN_ATTEMPTS_TO_TRUST:
        return {}
    if stats["accuracy"] >= STRONG_THRESHOLD:
        return {}

    avg_time = stats.get("avg_time_seconds", 0)
    hints = stats.get("avg_hints_used", 0)

    has_time = baseline_seconds is not None and avg_time > 0
    slow = has_time and avg_time > SLOW_FACTOR * baseline_seconds
    fast = has_time and avg_time <= FAST_FACTOR * baseline_seconds
    needs_hints = hints >= HINT_LIMIT

    if slow or needs_hints:
        return {
            "insight": "concept_gap",
            "insight_label": "Concept gap",
            "insight_text": (
                "You are slow or need hints here, so the idea itself may not be "
                "clear yet. Re-read this concept first, then practice."
            ),
        }
    if fast:
        return {
            "insight": "careless",
            "insight_label": "Careless mistakes",
            "insight_text": (
                "You answer fast but get it wrong, so it may be rushing. "
                "Slow down and read every option before you pick."
            ),
        }
    return {}


def generate_weakness_statement(topic, subtopic_analysis):
    """
    Rule-based reasoning: looks at the weakest and strongest subtopics
    and produces an explainable, honest statement - explicitly using
    "possible/probable" language, never a diagnosis.
    """
    # Filter out subtopics with too few attempts to draw a confident conclusion
    trustworthy = [s for s in subtopic_analysis if s["attempts"] >= MIN_ATTEMPTS_TO_TRUST]

    if not trustworthy:
        return {
            "has_enough_data": False,
            "message": "Not enough attempts yet to confidently identify a specific weakness.",
        }

    weakest = trustworthy[0]
    strongest = trustworthy[-1]

    if weakest["accuracy"] >= STRONG_THRESHOLD:
        return {
            "has_enough_data": True,
            "weak_subtopic": None,
            "message": f"You're performing well across all parts of {topic}. No specific weakness detected.",
        }

    is_specific = (
        weakest["accuracy"] <= WEAK_THRESHOLD
        and strongest["accuracy"] >= STRONG_THRESHOLD
        and weakest["subtopic"] != strongest["subtopic"]
    )

    if is_specific:
        message = (
            f"Possible weakness detected: your attempts suggest you may be "
            f"struggling specifically with '{weakest['subtopic']}' in {topic}, "
            f"while performing well on '{strongest['subtopic']}'."
        )
    else:
        message = (
            f"Possible weakness detected: your attempts suggest you may be "
            f"struggling with '{weakest['subtopic']}' in {topic}."
        )

    return {
        "has_enough_data": True,
        "weak_subtopic": weakest["subtopic"],
        "accuracy": weakest["accuracy"],
        "attempts_analyzed": weakest["attempts"],
        "message": message,
    }


def build_recovery_plan(topic, weak_subtopic):
    return {
        "topic": topic,
        "weak_subtopic": weak_subtopic,
        "steps": [
            {"step": 1, "action": "explain_concept", "description": f"Explain {weak_subtopic} in simple terms with an example."},
            {"step": 2, "action": "easy_practice", "description": f"3 easy-level questions on {weak_subtopic}."},
            {"step": 3, "action": "medium_practice", "description": f"3 medium-level questions on {weak_subtopic}."},
            {"step": 4, "action": "retest", "description": f"Re-test at original difficulty on {weak_subtopic}."},
            {"step": 5, "action": "compare_performance", "description": "Compare before/after accuracy to measure improvement."},
        ],
    }


if __name__ == "__main__":
    attempts = load_attempts(DATA_PATH)

    student_id = "S001"
    topic = "Python Basics"

    student_attempts = get_student_topic_attempts(attempts, student_id, topic)
    subtopic_analysis = analyze_by_subtopic(student_attempts)

    print(f"{student_id}'s subtopic breakdown for {topic}:")
    for item in subtopic_analysis:
        print(f"  {item['subtopic']}: {item['accuracy']*100:.0f}% ({item['attempts']} attempts)")
    print()

    weakness = generate_weakness_statement(topic, subtopic_analysis)
    print("WEAKNESS ANALYSIS:")
    print(f"  {weakness['message']}")
    print()

    if weakness.get("weak_subtopic"):
        plan = build_recovery_plan(topic, weakness["weak_subtopic"])
        print("RECOVERY PLAN:")
        for step in plan["steps"]:
            print(f"  Step {step['step']}: {step['description']}")