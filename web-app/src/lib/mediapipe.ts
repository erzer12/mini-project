// MediaPipe Hand Landmarker - loaded via CDN
// Uses cdnImport to bypass Turbopack's static import() analysis

import { cdnImport } from "./cdn-import";

const VISION_CDN =
	"https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/vision_bundle.mjs";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let handLandmarker: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let visionModule: any = null;

const loadVisionModule = async () => {
	if (visionModule) return visionModule;
	visionModule = await cdnImport(VISION_CDN);
	return visionModule;
};

export const getHandLandmarker = async () => {
	if (handLandmarker) {
		return handLandmarker;
	}

	const { FilesetResolver, HandLandmarker } = await loadVisionModule();

	const vision = await FilesetResolver.forVisionTasks(
		"https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/wasm",
	);

	handLandmarker = await HandLandmarker.createFromOptions(vision, {
		baseOptions: {
			modelAssetPath:
				"https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
			delegate: "GPU",
		},
		runningMode: "VIDEO",
		numHands: 1,
	});

	return handLandmarker;
};

export const getDrawingUtils = async () => {
	const mod = await loadVisionModule();
	return mod.DrawingUtils;
};

export const getHandConnections = async () => {
	const { HandLandmarker } = await loadVisionModule();
	return HandLandmarker.HAND_CONNECTIONS;
};
