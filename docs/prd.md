Product Requirements Document (PRD): SignStream Live

Project Name: SignStream Live

Version: 1.1.0 (No-Auth Stream Focus)

1. Executive Summary

SignStream Live is a real-time, browser-based translation tool that converts sign language hand gestures into live captions and audible speech. By focusing on a "plug-and-play" streaming interface without login requirements, the platform provides immediate accessibility for users to communicate via sign language.

2. Core Objectives

Accessibility: Instant translation of ASL letters and signs into text and audio.

Performance: Achieve sub-100ms latency to ensure the "live" feel of a streaming platform.

Privacy: On-device inference ensures video data remains in the user's browser.

3. Functional Requirements

FR-1: Live Stream View: Mirror the user's webcam feed with a high-frame-rate overlay.

FR-2: Static Sign Detection: Recognize the 26 English letters using landmark-based classification.

FR-3: Sentence Construction: A buffer system to append recognized letters into words and sentences.

FR-4: Integrated TTS: A "Speak" function to vocalize the current caption buffer using the browser's native speech engine.

FR-5: Gesture Commands: Mapping specific hand shapes to "Space" (word break) and "Clear" (reset caption).

4. User Experience (UX)

Immediate Access: No sign-up/login; the app opens directly to the camera interface.

Visual Feedback: A "lock-in" indicator showing when a sign has been successfully stabilized and recorded.

High Contrast: Large, legible captions designed for streaming visibility.