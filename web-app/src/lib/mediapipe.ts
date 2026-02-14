import { FilesetResolver, HandLandmarker } from "@mediapipe/tasks-vision";

let handLandmarker: HandLandmarker | null = null;

export const getHandLandmarker = async () => {
	if (handLandmarker) {
		return handLandmarker;
	}

	const vision = await FilesetResolver.forVisionTasks(
		"https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3",
	);

	handLandmarker = await HandLandmarker.createFromOptions(vision, {
		baseOptions: {
			modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
			delegate: "GPU",
		},
		runningMode: "VIDEO",
		numHands: 1,
	});

	return handLandmarker;
};
