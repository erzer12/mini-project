"""
ASL Landmark Data Collector & Trainer

This script:
1. Opens the webcam and runs MediaPipe Hand Landmark detection
2. Shows the current target letter on screen
3. When SPACE is pressed, captures landmark data for that letter
4. After collecting data for all letters, trains an XGBoost model
5. Exports the model to ONNX for use in the web app

Usage:
    python collect_and_train.py

Controls:
    SPACE  - Capture a sample for the current letter
    N      - Skip to the next letter
    Q      - Finish collecting and start training
"""

import cv2
import numpy as np
import os
import json
from pathlib import Path

# MediaPipe Tasks API (works with mediapipe >= 0.10.x on Python 3.12+)
import mediapipe as mp
from mediapipe.tasks import python
from mediapipe.tasks.python import vision

# --- Configuration ---
SAMPLES_PER_LETTER = 30
LETTERS = list("ABCDEFGHIKLMNOPQRSTUVWXY")  # 24 letters (no J or Z)
OUTPUT_DIR = Path(__file__).parent.parent / "data" / "landmark_dataset"
MODEL_OUTPUT = Path(__file__).parent.parent.parent / "web-app" / "public" / "models" / "model.onnx"


def normalize_landmarks(landmarks) -> list:
    """Normalize 21 landmarks relative to wrist (index 0), return 63 floats."""
    wrist = landmarks[0]
    result = []
    for lm in landmarks:
        result.extend([
            lm.x - wrist.x,
            lm.y - wrist.y,
            lm.z - wrist.z,
        ])
    return result


def collect_data():
    """Collect landmark data from webcam using MediaPipe Tasks API."""

    # Download hand landmarker model
    model_path = Path(__file__).parent / "hand_landmarker.task"
    if not model_path.exists():
        print("Downloading hand landmarker model...")
        import urllib.request
        url = "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task"
        urllib.request.urlretrieve(url, str(model_path))
        print("Download complete.")

    # Create hand landmarker
    base_options = python.BaseOptions(model_asset_path=str(model_path))
    options = vision.HandLandmarkerOptions(
        base_options=base_options,
        running_mode=vision.RunningMode.VIDEO,
        num_hands=1,
        min_hand_detection_confidence=0.5,
        min_tracking_confidence=0.5,
    )
    hand_landmarker = vision.HandLandmarker.create_from_options(options)

    cap = cv2.VideoCapture(0)
    cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)

    all_data = []
    letter_idx = 0
    sample_count = 0
    frame_timestamp_ms = 0

    print("\n=== ASL Landmark Data Collector ===")
    print(f"Collect {SAMPLES_PER_LETTER} samples per letter.")
    print("SPACE = capture, N = next letter, Q = finish\n")

    while cap.isOpened() and letter_idx < len(LETTERS):
        ret, frame = cap.read()
        if not ret:
            break

        frame = cv2.flip(frame, 1)  # Mirror
        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)

        # Create MediaPipe Image and detect
        mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)
        frame_timestamp_ms += 33  # ~30fps
        results = hand_landmarker.detect_for_video(mp_image, frame_timestamp_ms)

        # Draw landmarks manually
        detected = False
        current_landmarks = None
        if results.hand_landmarks and len(results.hand_landmarks) > 0:
            detected = True
            current_landmarks = results.hand_landmarks[0]
            h, w = frame.shape[:2]

            # Draw landmarks as circles
            for lm in current_landmarks:
                cx, cy = int(lm.x * w), int(lm.y * h)
                cv2.circle(frame, (cx, cy), 4, (0, 0, 255), -1)

            # Draw connections
            connections = [
                (0,1),(1,2),(2,3),(3,4),
                (0,5),(5,6),(6,7),(7,8),
                (0,9),(9,10),(10,11),(11,12),
                (0,13),(13,14),(14,15),(15,16),
                (0,17),(17,18),(18,19),(19,20),
                (5,9),(9,13),(13,17),
            ]
            for c1, c2 in connections:
                p1 = (int(current_landmarks[c1].x * w), int(current_landmarks[c1].y * h))
                p2 = (int(current_landmarks[c2].x * w), int(current_landmarks[c2].y * h))
                cv2.line(frame, p1, p2, (0, 255, 0), 2)

        # UI overlay
        letter = LETTERS[letter_idx]
        cv2.rectangle(frame, (0, 0), (640, 80), (0, 0, 0), -1)
        cv2.putText(frame, f"Show sign: {letter}", (10, 35),
                    cv2.FONT_HERSHEY_SIMPLEX, 1.2, (0, 255, 0), 3)
        status = "HAND DETECTED" if detected else "No hand - position clearly"
        color = (0, 255, 0) if detected else (0, 0, 255)
        cv2.putText(frame, f"{status}  |  Samples: {sample_count}/{SAMPLES_PER_LETTER}  |  Letter {letter_idx+1}/{len(LETTERS)}",
                    (10, 65), cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 1)

        # Progress bar
        progress = sample_count / SAMPLES_PER_LETTER
        cv2.rectangle(frame, (10, 72), (10 + int(620 * progress), 78), (0, 255, 0), -1)

        cv2.imshow("ASL Collector - SPACE=capture, N=next, Q=quit", frame)
        key = cv2.waitKey(1) & 0xFF

        if key == ord(' '):  # Capture
            if detected and current_landmarks:
                normalized = normalize_landmarks(current_landmarks)
                all_data.append((letter_idx, normalized))
                sample_count += 1
                print(f"  Captured {letter} sample {sample_count}/{SAMPLES_PER_LETTER}")

                if sample_count >= SAMPLES_PER_LETTER:
                    letter_idx += 1
                    sample_count = 0
                    if letter_idx < len(LETTERS):
                        print(f"\n-> Next letter: {LETTERS[letter_idx]}")
            else:
                print("  No hand detected! Position your hand clearly.")

        elif key == ord('n'):  # Next letter
            letter_idx += 1
            sample_count = 0
            if letter_idx < len(LETTERS):
                print(f"\n-> Skipped to: {LETTERS[letter_idx]}")

        elif key == ord('q'):  # Quit collection
            break

    cap.release()
    cv2.destroyAllWindows()
    hand_landmarker.close()

    return all_data


def save_dataset(all_data):
    """Save collected data to disk."""
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    filepath = OUTPUT_DIR / "landmarks.json"

    dataset = {
        "labels": [d[0] for d in all_data],
        "features": [d[1] for d in all_data],
        "label_names": LETTERS,
    }

    with open(filepath, "w") as f:
        json.dump(dataset, f)

    print(f"\nSaved {len(all_data)} samples to {filepath}")
    return filepath


def train_model(dataset_path):
    """Train XGBoost on landmark data and export to ONNX."""
    from xgboost import XGBClassifier
    from sklearn.model_selection import train_test_split
    from sklearn.metrics import accuracy_score, classification_report

    print("\n=== Training Model ===")

    with open(dataset_path, "r") as f:
        dataset = json.load(f)

    X = np.array(dataset["features"], dtype=np.float32)
    y = np.array(dataset["labels"], dtype=np.int32)
    label_names = dataset["label_names"]

    print(f"Dataset: {X.shape[0]} samples, {X.shape[1]} features, {len(set(y))} classes")

    if len(set(y)) < 2:
        print("ERROR: Need at least 2 classes. Collect data for more letters.")
        return None

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    model = XGBClassifier(
        eval_metric="mlogloss",
        n_estimators=200,
        max_depth=6,
        tree_method="hist",
    )
    model.fit(X_train, y_train)

    y_pred = model.predict(X_test)
    acc = accuracy_score(y_test, y_pred)
    print(f"\nAccuracy: {acc:.4f}")

    present_labels = sorted(set(y))
    target = [label_names[i] for i in present_labels]
    print(classification_report(y_test, y_pred, target_names=target))

    # Export to ONNX
    export_to_onnx(model, X_train.shape[1])
    return model


def export_to_onnx(model, n_features):
    """Export the trained model to ONNX format."""
    from onnxmltools.convert import convert_xgboost
    from onnxmltools.convert.common.data_types import FloatTensorType

    print("\n=== Exporting to ONNX ===")

    model.get_booster().feature_names = [f"f{i}" for i in range(n_features)]
    initial_type = [("float_input", FloatTensorType([None, n_features]))]
    onnx_model = convert_xgboost(model, initial_types=initial_type)

    MODEL_OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    with open(MODEL_OUTPUT, "wb") as f:
        f.write(onnx_model.SerializeToString())

    print(f"ONNX model saved to {MODEL_OUTPUT}")
    print("\nDone! Restart your web app to use the new model.")


if __name__ == "__main__":
    print("=" * 50)
    print("  ASL Sign Language - Landmark Data Collector")
    print("=" * 50)

    choice = input("\n[C]ollect new data, [T]rain from existing, or [B]oth? ").strip().upper()

    if choice in ("C", "B"):
        data = collect_data()
        if len(data) > 0:
            dataset_path = save_dataset(data)
        else:
            print("No data collected!")
            exit(1)

    if choice == "T":
        dataset_path = OUTPUT_DIR / "landmarks.json"
        if not dataset_path.exists():
            print(f"No dataset found at {dataset_path}. Run collection first.")
            exit(1)

    if choice in ("T", "B"):
        train_model(dataset_path)
    elif choice == "C":
        print("\nData collected. Run again with 'T' to train.")
