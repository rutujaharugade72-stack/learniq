import joblib
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.tree import DecisionTreeClassifier
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix

DATA_PATH = "data/student_topic_features.csv"


def label_performance(accuracy):
    if accuracy >= 0.75:
        return "Strong"
    elif accuracy >= 0.45:
        return "Improving"
    else:
        return "Weak"


def main():
    df = pd.read_csv(DATA_PATH)

    df["performance_label"] = df["accuracy"].apply(label_performance)

    print("Label distribution:")
    print(df["performance_label"].value_counts())
    print()

    feature_columns = [
        "num_attempts", "avg_time_taken", "avg_hints_used",
        "accuracy_trend", "hard_accuracy",
    ]
    X = df[feature_columns]
    y = df["performance_label"]

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.25, random_state=42, stratify=y
    )

    model = DecisionTreeClassifier(max_depth=4, random_state=42, class_weight="balanced")
    model.fit(X_train, y_train)

    y_pred = model.predict(X_test)

    print(f"Test set size: {len(y_test)}")
    print(f"Accuracy: {accuracy_score(y_test, y_pred):.2f}")
    print()
    print("Classification report:")
    print(classification_report(y_test, y_pred, zero_division=0))
    print("Confusion matrix (rows=actual, cols=predicted):")
    print(confusion_matrix(y_test, y_pred, labels=["Strong", "Improving", "Weak"]))

    print()
    print("Feature importances:")
    for name, importance in zip(feature_columns, model.feature_importances_):
        print(f"  {name}: {importance:.3f}")

    # Save the trained model so the API can load it without retraining
    joblib.dump(model, "model_performance_classifier.pkl")
    print()
    print("Model saved -> model_performance_classifier.pkl")


if __name__ == "__main__":
    main()