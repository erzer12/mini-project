Software Requirements Specification (SRS): SignStream Live

Version: 1.1.0

1. System Requirements

Runtime Environment: Modern Web Browser (Chrome 110+, Edge 110+, Safari 16+).

Hardware: Standard 720p/1080p Webcam.

Client-Side Processing: All AI logic must execute in the browser via WebGL or WebAssembly.

2. Technical Specifications

2.1 MediaPipe Landmarker

Input: Video stream ($1280 \times 720$ preferred).

Output: 21 landmark points in 3D space $(x, y, z)$.

Sampling Rate: Minimum 24 FPS.

2.2 Inference Engine (ONNX)

Model Format: ONNX (converted from XGBoost).

Input Shape: [1, 63] (21 points $\times$ 3 coordinates).

Execution Provider: webgl (default) or wasm.

2.3 Preprocessing Pipeline

Normalization: Every landmark coordinate $(x_i, y_i, z_i)$ must be translated relative to the wrist $(x_0, y_0, z_0)$.

Flattening: The 21 triplets must be flattened into a 1D array of 63 floats for model consumption.

3. Performance Requirements

Inference Latency: < 50ms per frame.

Startup Time: Model and WASM loading must complete in under 5 seconds on average connections.