"""
LEARNIQ - Study Planner Engine

Builds a day-by-day study plan from the student's weak subtopics
(the same data that "Why Am I Stuck?" produces).

No LLM is used here: it is explainable, rule-based planning, so it costs no
AI quota and every task comes with a reason.

How the plan is made:
1. Rank the weak subtopics: the lower the accuracy, the higher the priority.
   A dropping trend raises the priority, an improving trend lowers it.
2. For each subtopic (most urgent first) schedule up to 3 tasks:
   - "learn"    re-read the idea (skipped when the mistakes look careless)
   - "practice" a short quiz on that subtopic
   - "retest"   a quick quiz at least 2 days later (spaced repetition)
3. Every day has a time budget. A task never goes on a day that is already
   full. Subtopics that do not fit are listed honestly in "left_out"
   instead of being squeezed in.
4. When there are 3 or more study days, the LAST study day is a mixed
   revision quiz.
5. The student can mark weekdays as rest days (0 minutes) or give a weekday
   its own time, for example 30 minutes on weekdays and 90 on Sunday.
"""

from datetime import date, timedelta

MAX_DAYS = 30
MIN_MINUTES_PER_DAY = 15
MAX_MINUTES_PER_DAY = 240
MAX_SUBTOPICS = 12

LEARN_MIN = 20
PRACTICE_MIN = 15
RETEST_MIN = 10
REVISION_MIN = 20
RETEST_GAP_DAYS = 2

TYPE_RANK = {"learn": 0, "practice": 1, "retest": 2, "revision": 3}

HOW_IT_WORKS = [
    "Your weakest subtopics come first: the lower your accuracy, the higher the priority.",
    "A subtopic where your accuracy dropped gets extra priority; one that is improving gets a little less.",
    "Each subtopic gets a short lesson, a practice quiz, and a re-test at least 2 days later.",
    "If your mistakes look careless (fast but wrong), the lesson is skipped and you practice more slowly instead.",
    "Every day stays inside your daily time. What does not fit is listed under 'Not enough time for'.",
    "When you have 3 or more study days, the last study day is a mixed revision quiz.",
    "Rest days stay empty, and days with a different time use that time.",
]


def priority_score(item):
    """Higher score = needs attention sooner."""
    accuracy = item.get("accuracy")
    score = 0.5 if accuracy is None else 1.0 - float(accuracy)

    trend = item.get("trend")
    if trend == "dropped":
        score += 0.15
    elif trend == "improved":
        score -= 0.1

    if item.get("insight") == "concept_gap":
        score += 0.05
    return round(score, 3)


def reason_for(item):
    """A short, honest reason shown next to every task."""
    accuracy = item.get("accuracy")
    attempts = item.get("attempts") or 0
    parts = []

    if accuracy is None:
        parts.append("You chose this topic yourself.")
    else:
        pct = round(float(accuracy) * 100)
        if accuracy < 0.5:
            parts.append(f"Only {pct}% correct over {attempts} attempts.")
        else:
            parts.append(f"{pct}% correct so far ({attempts} attempts).")

    trend = item.get("trend")
    then_a = item.get("then_accuracy")
    now_a = item.get("now_accuracy")
    if trend and then_a is not None and now_a is not None:
        then_pct = round(float(then_a) * 100)
        now_pct = round(float(now_a) * 100)
        if trend == "dropped":
            parts.append(f"It dropped from {then_pct}% to {now_pct}%.")
        elif trend == "improved":
            parts.append(f"You are improving ({then_pct}% to {now_pct}%), keep it up.")

    if item.get("insight_text"):
        parts.append(str(item["insight_text"]))

    return " ".join(parts)


def _parse_day(value, label):
    try:
        return date.fromisoformat(str(value))
    except (TypeError, ValueError):
        raise ValueError(f"{label} must look like 2026-12-31")


def _parse_weekday_minutes(value, default_minutes):
    """
    value: None or a dict like {"6": 0, "5": 90}. Keys are weekdays,
    Monday = 0 ... Sunday = 6. 0 means a rest day. Any other number is
    clamped to the allowed range.
    Returns a list of 7 numbers (minutes for Monday ... Sunday).
    """
    minutes = [default_minutes] * 7
    if value is None or value == {}:
        return minutes
    if not isinstance(value, dict):
        raise ValueError('minutes_by_weekday must be an object like {"6": 0}')
    for key, raw in value.items():
        try:
            day = int(key)
            number = int(raw)
        except (TypeError, ValueError):
            raise ValueError("minutes_by_weekday must use numbers")
        if day < 0 or day > 6:
            raise ValueError("weekday must be between 0 (Monday) and 6 (Sunday)")
        if number <= 0:
            minutes[day] = 0
        else:
            minutes[day] = max(MIN_MINUTES_PER_DAY, min(MAX_MINUTES_PER_DAY, number))
    return minutes


def build_plan(items, start_date, target_date, minutes_per_day, minutes_by_weekday=None):
    """
    items: list of dicts with topic, subtopic and optionally accuracy, attempts,
           trend, then_accuracy, now_accuracy, insight, insight_text, insight_label.
    minutes_by_weekday: optional {"0": 30, "6": 0 ...} (Monday = 0). 0 = rest day.
    Returns a plan dict.
    """
    start = _parse_day(start_date, "start_date")
    target = _parse_day(target_date, "target_date")
    if target < start:
        raise ValueError("The exam date must be today or later.")

    try:
        minutes_per_day = int(minutes_per_day)
    except (TypeError, ValueError):
        raise ValueError("minutes_per_day must be a number")
    minutes_per_day = max(MIN_MINUTES_PER_DAY, min(MAX_MINUTES_PER_DAY, minutes_per_day))
    weekday_minutes = _parse_weekday_minutes(minutes_by_weekday, minutes_per_day)

    real_days = (target - start).days + 1
    n_days = min(real_days, MAX_DAYS)
    capped = real_days > MAX_DAYS

    # Minutes available on each day of the plan (0 = rest day)
    day_minutes = [weekday_minutes[(start + timedelta(days=i)).weekday()] for i in range(n_days)]
    if sum(day_minutes) == 0:
        raise ValueError("Every day in this period is a rest day. Turn on at least one study day.")

    # Clean the incoming items and drop duplicates (same topic + subtopic)
    seen = set()
    clean = []
    for raw in items or []:
        if not isinstance(raw, dict):
            continue
        topic = str(raw.get("topic") or "").strip()
        subtopic = str(raw.get("subtopic") or "").strip() or topic
        if not topic and not subtopic:
            continue
        key = (topic.lower(), subtopic.lower())
        if key in seen:
            continue
        seen.add(key)
        item = dict(raw)
        item["topic"] = topic or subtopic
        item["subtopic"] = subtopic
        clean.append(item)

    base = {
        "start_date": start.isoformat(),
        "target_date": target.isoformat(),
        "days_count": n_days,
        "minutes_per_day": minutes_per_day,
        "minutes_by_weekday": weekday_minutes,
        "capped": capped,
        "how_it_works": HOW_IT_WORKS,
    }

    def build_days(placed_tasks):
        days = []
        total_minutes = 0
        for idx in range(n_days):
            day_date = start + timedelta(days=idx)
            todays = sorted(
                [t for t in placed_tasks if t["day"] == idx],
                key=lambda t: (TYPE_RANK[t["type"]], t["_order"]),
            )
            tasks = []
            for k, t in enumerate(todays):
                tasks.append({
                    "id": f"d{idx}-t{k}",
                    "day": idx,
                    "date": day_date.isoformat(),
                    "type": t["type"],
                    "title": t["title"],
                    "minutes": t["minutes"],
                    "topic": t["topic"],
                    "subtopic": t["subtopic"],
                    "reason": t["reason"],
                    "done": False,
                })
            minutes = sum(t["minutes"] for t in tasks)
            total_minutes += minutes
            days.append({
                "index": idx,
                "date": day_date.isoformat(),
                "label": f"Day {idx + 1}",
                "weekday": day_date.strftime("%a"),
                "capacity": day_minutes[idx],
                "rest": day_minutes[idx] == 0,
                "minutes": minutes,
                "tasks": tasks,
            })
        return days, total_minutes

    if not clean:
        days, _ = build_days([])
        base.update({
            "needs_data": True,
            "message": "No weak topics yet. Take a quiz first, or type the topics you want to study.",
            "days": days,
            "left_out": [],
            "summary": {"subtopics_planned": 0, "total_tasks": 0, "total_minutes": 0},
        })
        return base

    ranked = sorted(clean, key=lambda it: (-priority_score(it), str(it["subtopic"]).lower()))
    ranked = ranked[:MAX_SUBTOPICS]

    study_day_indexes = [i for i in range(n_days) if day_minutes[i] > 0]
    revision_day = None
    if n_days >= 3 and len(study_day_indexes) >= 2:
        revision_day = study_day_indexes[-1]  # the last day the student can study

    remaining = list(day_minutes)
    if revision_day is not None:
        remaining[revision_day] = 0  # reserved for the revision quiz

    placed_tasks = []  # dicts with a temporary "_order"
    counter = [0]

    def place(minutes, earliest):
        """First day (from `earliest`) that still has room. Returns (day, minutes) or (None, minutes)."""
        for d in range(max(0, earliest), n_days):
            if remaining[d] <= 0:
                continue
            needed = min(minutes, day_minutes[d])
            if remaining[d] >= needed:
                return d, needed
        return None, minutes

    def add(task_type, minutes, day, item, title):
        remaining[day] -= minutes
        counter[0] += 1
        task = {
            "type": task_type,
            "title": title,
            "minutes": minutes,
            "day": day,
            "topic": item["topic"],
            "subtopic": item["subtopic"],
            "reason": reason_for(item),
            "done": False,
            "_order": counter[0],
        }
        placed_tasks.append(task)
        return task

    left_out = []
    planned = []

    for item in ranked:
        needs_learn = item.get("insight") != "careless"
        learn_task = None
        learn_day = None

        if needs_learn:
            d, m = place(LEARN_MIN, 0)
            if d is not None:
                learn_task = add("learn", m, d, item, f"Understand: {item['subtopic']}")
                learn_day = d

        d, m = place(PRACTICE_MIN, learn_day if learn_day is not None else 0)
        if d is None:
            # Roll back the lesson, so we never plan half a subtopic
            if learn_task is not None:
                placed_tasks.remove(learn_task)
                remaining[learn_task["day"]] += learn_task["minutes"]
            left_out.append({"topic": item["topic"], "subtopic": item["subtopic"]})
            continue

        title = f"Practice: {item['subtopic']}"
        if item.get("insight") == "careless":
            title = f"Practice slowly: {item['subtopic']}"
        practice_task = add("practice", m, d, item, title)

        rd, rm = place(RETEST_MIN, practice_task["day"] + RETEST_GAP_DAYS)
        if rd is not None:
            add("retest", rm, rd, item, f"Re-test: {item['subtopic']}")

        planned.append(item)

    if revision_day is not None and planned:
        focus = planned[:3]
        placed_tasks.append({
            "type": "revision",
            "title": "Final revision quiz",
            "minutes": min(REVISION_MIN, day_minutes[revision_day]),
            "day": revision_day,
            "topic": focus[0]["topic"],
            "subtopic": ", ".join(f["subtopic"] for f in focus),
            "reason": "A mixed quiz on your weakest topics to lock them in before the exam.",
            "done": False,
            "_order": counter[0] + 1,
        })

    days, total_minutes = build_days(placed_tasks)
    total_tasks = sum(len(d["tasks"]) for d in days)
    base.update({
        "needs_data": False,
        "message": "",
        "days": days,
        "left_out": left_out,
        "summary": {
            "subtopics_planned": len(planned),
            "total_tasks": total_tasks,
            "total_minutes": total_minutes,
        },
    })
    return base


if __name__ == "__main__":
    demo_items = [
        {"topic": "Python", "subtopic": "Recursion", "accuracy": 0.25, "attempts": 8,
         "trend": "dropped", "then_accuracy": 0.5, "now_accuracy": 0.0,
         "insight": "concept_gap", "insight_text": "You were slow or needed hints, so the idea may not be clear yet."},
        {"topic": "Python", "subtopic": "Loops", "accuracy": 0.4, "attempts": 5,
         "insight": "careless", "insight_text": "You answer fast but get it wrong. Slow down."},
        {"topic": "Testing", "subtopic": "System testing", "accuracy": 0.45, "attempts": 4},
    ]
    start = date.today()
    # Demo: 45 minutes a day, and Sunday is a rest day
    plan = build_plan(demo_items, start.isoformat(), (start + timedelta(days=8)).isoformat(), 45, {"6": 0})
    print(f"Plan: {plan['days_count']} days, {plan['summary']['total_tasks']} tasks, "
          f"{plan['summary']['total_minutes']} min total")
    for d in plan["days"]:
        note = " (rest day)" if d["rest"] else ""
        print(f"\n{d['label']} ({d['weekday']} {d['date']}) - {d['minutes']}/{d['capacity']} min{note}")
        for t in d["tasks"]:
            print(f"  [{t['type']:<8}] {t['title']} ({t['minutes']} min)")
    if plan["left_out"]:
        print("\nNot enough time for:", [x["subtopic"] for x in plan["left_out"]])