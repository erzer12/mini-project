Software Design Document (SDD): SignStream Live

Version: 1.1.0

1. Architecture Overview

The system is built as a Single-Page Application (SPA) using Next.js. It follows a decoupled architecture where the UI rendering is separated from the high-frequency AI processing loop.

2. Component Design

2.1 The Prediction Loop

Frame Capture: requestAnimationFrame captures a frame from the <video> element.

Landmark Detection: MediaPipe processes the frame to return a landmark array.

Normalization: The normalize() utility shifts the origin to the wrist.

Inference: ONNX Runtime Web runs the sign_model.onnx session.

Post-Processing: The stability buffer evaluates the last $N$ predictions.

2.2 Stability Buffer & Sentence Logic

To prevent flickering (e.g., 'A' flickering to 'S'), we implement a Majority Vote Buffer:

Queue Size: 10 frames.

Commit Threshold: 8/10 frames must be identical to "lock" a character.

Debounce: Once a character is committed, the buffer is flushed to prevent double-entry of the same letter.

3. UI/UX Interface

Mirror Mode: Video feed is flipped horizontally to behave like a mirror.

Overlay Canvas: A transparent canvas sits atop the video to draw hand skeletons for user feedback.

TTS Integration: Clicking "Speak" calls the window.speechSynthesis API with the current caption state.

4. Data Flow

Webcam -> MediaPipe Landmarker -> Coordinate Normalization -> ONNX (XGBoost) -> Stability Buffer -> State Store -> UI/TTS