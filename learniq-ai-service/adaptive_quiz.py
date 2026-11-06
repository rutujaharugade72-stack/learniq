DIFFICULTY_LEVELS = ["Easy", "Medium", "Hard"]


def get_next_difficulty(current_difficulty, recent_results, window_size=3):
    current_index = DIFFICULTY_LEVELS.index(current_difficulty)

    recent = recent_results[-window_size:]

    if len(recent) < 2:
        return current_difficulty

    correct_count = sum(1 for r in recent if r)
    accuracy = correct_count / len(recent)

    if accuracy >= 0.7 and current_index < len(DIFFICULTY_LEVELS) - 1:
        return DIFFICULTY_LEVELS[current_index + 1]

    if accuracy <= 0.3 and current_index > 0:
        return DIFFICULTY_LEVELS[current_index - 1]

    return current_difficulty


def simulate_quiz_session(answer_sequence, starting_difficulty="Medium"):
    current_difficulty = starting_difficulty
    recent_results = []
    session_log = []

    for i, is_correct in enumerate(answer_sequence, 1):
        session_log.append({
            "question_number": i,
            "difficulty_shown": current_difficulty,
            "answered_correct": is_correct,
        })

        recent_results.append(is_correct)
        current_difficulty = get_next_difficulty(current_difficulty, recent_results)

    return session_log


if __name__ == "__main__":
    strong_student = [True, True, True, True, True, True]
    print("Simulated STRONG student (all correct):")
    for entry in simulate_quiz_session(strong_student):
        print(f"  Q{entry['question_number']}: shown {entry['difficulty_shown']}, answered {'correct' if entry['answered_correct'] else 'wrong'}")

    print()

    weak_student = [False, False, True, False, False, False]
    print("Simulated STRUGGLING student:")
    for entry in simulate_quiz_session(weak_student):
        print(f"  Q{entry['question_number']}: shown {entry['difficulty_shown']}, answered {'correct' if entry['answered_correct'] else 'wrong'}")