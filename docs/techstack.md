Technology Stack: SignStream Live (Updated)

This stack is selected for maximum performance in a no-authentication, real-time streaming environment.

1. Frontend & UI

Framework: Next.js 14+ (App Router).

Styling: Tailwind CSS (for layout) + Lucide React (for icons).

Component Library: Shadcn UI (for accessible buttons and overlays).

State Management: React Hooks (useState/useRef) for real-time tracking.

2. Computer Vision & AI

Tracking: MediaPipe Tasks Vision (JavaScript/WASM) - For high-speed 3D hand landmarks.

Classifier: XGBoost - Trained in Python, known for high performance on tabular landmark data.

Runtime: ONNX Runtime Web - To run .onnx models using hardware acceleration (WebGL).

3. Communication & Output

Video Capture: Browser MediaDevices API.

Audio Output: Web Speech API (Native browser Text-to-Speech).

4. Development & Training

Environment: Python 3.10+.

Library: xgboost, onnxmltools, scikit-learn.

Deployment: Vercel (Frontend).