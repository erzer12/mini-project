# SignStream

SignStream is a real-time ASL translation system that combines a high-performance Next.js web application with a Python-based AI research environment.

## Project Structure

### 🌐 web-app/
The "Restaurant". A Next.js 14 application serving the real-time experience.
- **Frontend**: React, Tailwind CSS, Shadcn UI.
- **AI Runtime**: MediaPipe (Hands) + ONNX Runtime Web (Inference).
- **Logic**: No backend required (Client-side AI).
- **Run**: `cd web-app && npm run dev`

### 🧪 ai-lab/
The "Kitchen". A Python environment for data collection, processing, and model training.
- **src/collect.py**: Capture training data from webcam.
- **src/process.py**: Convert images to Normalized Landmarks (MediaPipe).
- **src/train.py**: Train XGBoost/RandomForest and export to ONNX.
- **data/**: Storage for external (raw) and processed datasets.

## Getting Started

1. **Web Application**:
   ```bash
   cd web-app
   npm install
   npm run dev
   ```

2. **AI Lab (Python)**:
   ```bash
   cd ai-lab
   pip install opencv-python mediapipe scikit-learn numpy matplotlib
   python src/collect.py
   ```
   