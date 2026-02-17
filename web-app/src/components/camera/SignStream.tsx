"use client";

import React, { useRef, useEffect, useState } from "react";
import { getHandLandmarker, getDrawingUtils, getHandConnections } from "@/lib/mediapipe";
import { normalizeLandmarks } from "@/lib/normalization";
import { runInference } from "@/lib/onnx-inference";
import { MajorityVoteBuffer } from "@/lib/buffer-utils";

interface SignStreamProps {
	onPrediction: (char: string) => void;
	isStreaming: boolean;
}

// --- Pose stability helpers ---

/** Compute average movement between two sets of landmarks. */
function landmarkDelta(
	prev: { x: number; y: number; z: number }[],
	curr: { x: number; y: number; z: number }[],
): number {
	if (prev.length !== curr.length || prev.length === 0) return Infinity;
	let sum = 0;
	for (let i = 0; i < prev.length; i++) {
		const dx = curr[i].x - prev[i].x;
		const dy = curr[i].y - prev[i].y;
		sum += Math.sqrt(dx * dx + dy * dy);
	}
	return sum / prev.length;
}

// Thresholds (tune these)
const STABILITY_THRESHOLD = 0.012; // Max avg landmark movement to be "still"
const STABLE_FRAMES_NEEDED = 8; // Must be still for this many frames before predicting
const COOLDOWN_MS = 1500; // Minimum ms between predictions

const SignStream: React.FC<SignStreamProps> = ({
	onPrediction,
	isStreaming,
}) => {
	const videoRef = useRef<HTMLVideoElement>(null);
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const [loading, setLoading] = useState(true);
	const buffer = useRef(new MajorityVoteBuffer(10));
	const requestRef = useRef<number | null>(null);
	const lastVideoTimeRef = useRef<number>(-1);

	// Pose stability state
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const prevLandmarksRef = useRef<any[] | null>(null);
	const stableFrameCount = useRef(0);
	const lastPredictionTime = useRef(0);
	const hasInferredForPose = useRef(false);

	// Cache for CDN-loaded drawing utilities
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const drawingUtilsCtorRef = useRef<any>(null);
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const handConnectionsRef = useRef<any>(null);

	useEffect(() => {
		const init = async () => {
			const [DrawingUtils, connections] = await Promise.all([
				getDrawingUtils(),
				getHandConnections(),
			]);
			drawingUtilsCtorRef.current = DrawingUtils;
			handConnectionsRef.current = connections;

			if (videoRef.current) {
				try {
					const stream = await navigator.mediaDevices.getUserMedia({
						video: {
							width: 1280,
							height: 720,
							frameRate: { ideal: 30 },
						},
					});
					videoRef.current.srcObject = stream;
					videoRef.current.onloadedmetadata = () => {
						videoRef.current?.play();
						setLoading(false);
					};
				} catch (err) {
					console.error("Error accessing webcam", err);
					setLoading(false);
				}
			}
		};
		init();

		return () => {
			if (videoRef.current && videoRef.current.srcObject) {
				const stream = videoRef.current.srcObject as MediaStream;
				stream.getTracks().forEach((track) => track.stop());
			}
			cancelAnimationFrame(requestRef.current!);
		};
	}, []);

	const predictLoop = async () => {
		const video = videoRef.current;
		const canvas = canvasRef.current;
		if (!video || !canvas || !isStreaming) return;

		try {
			const ctx = canvas.getContext("2d");

			if (video.currentTime !== lastVideoTimeRef.current) {
				lastVideoTimeRef.current = video.currentTime;

				if (ctx) {
					ctx.clearRect(0, 0, canvas.width, canvas.height);
				}

				const handLandmarker = await getHandLandmarker();
				if (handLandmarker) {
					const results = handLandmarker.detectForVideo(video, performance.now());

					if (ctx && results.landmarks && results.landmarks.length > 0 && drawingUtilsCtorRef.current && handConnectionsRef.current) {
						ctx.save();
						ctx.scale(-1, 1);
						ctx.translate(-canvas.width, 0);

						const DrawingUtils = drawingUtilsCtorRef.current;
						const drawingUtils = new DrawingUtils(ctx);
						for (const landmarks of results.landmarks) {
							// Draw landmarks
							drawingUtils.drawConnectors(
								landmarks,
								handConnectionsRef.current,
								{ color: "#00FF00", lineWidth: 5 },
							);
							drawingUtils.drawLandmarks(landmarks, {
								color: "#FF0000",
								lineWidth: 2,
							});

							// --- Pose Stability Check ---
							const delta = prevLandmarksRef.current
								? landmarkDelta(prevLandmarksRef.current, landmarks)
								: Infinity;

							prevLandmarksRef.current = landmarks.map((lm: { x: number; y: number; z: number }) => ({
								x: lm.x, y: lm.y, z: lm.z,
							}));

							if (delta < STABILITY_THRESHOLD) {
								stableFrameCount.current++;
							} else {
								// Hand moved — reset stability and allow new inference
								stableFrameCount.current = 0;
								hasInferredForPose.current = false;
							}

							// Only infer when hand has been still long enough, cooldown passed, and not already inferred for this pose
							const now = performance.now();
							const cooldownPassed = now - lastPredictionTime.current > COOLDOWN_MS;
							const isStable = stableFrameCount.current >= STABLE_FRAMES_NEEDED;

							if (isStable && cooldownPassed && !hasInferredForPose.current) {
								try {
									const normalized = normalizeLandmarks(landmarks);
									if (normalized.length > 0) {
										const char = await runInference(normalized);

										if (char) {
											buffer.current.add(char);
											const stable = buffer.current.getStablePrediction();
											if (stable) {
												onPrediction(stable);
												buffer.current.clear();
												lastPredictionTime.current = now;
												hasInferredForPose.current = true; // Don't infer again until hand moves
											}
										}
									}
								} catch (inferErr) {
									console.warn("Inference error (continuing loop):", inferErr);
								}
							}

							// Draw stability indicator
							const stabilityPct = Math.min(stableFrameCount.current / STABLE_FRAMES_NEEDED, 1);
							const barWidth = 200;
							const barX = (canvas.width - barWidth) / 2;
							ctx.save();
							ctx.scale(-1, 1);
							ctx.translate(-canvas.width, 0);
							ctx.fillStyle = "rgba(0,0,0,0.5)";
							ctx.fillRect(barX - 2, canvas.height - 30, barWidth + 4, 20);
							ctx.fillStyle = stabilityPct >= 1 ? "#00ff00" : "#ffaa00";
							ctx.fillRect(barX, canvas.height - 28, barWidth * stabilityPct, 16);
							ctx.fillStyle = "#ffffff";
							ctx.font = "12px monospace";
							ctx.fillText(stabilityPct >= 1 ? "READY" : "Hold still...", barX + 60, canvas.height - 15);
							ctx.restore();
						}
						ctx.restore();
					} else {
						// No hand — reset stability
						prevLandmarksRef.current = null;
						stableFrameCount.current = 0;
						hasInferredForPose.current = false;
					}
				}
			}
		} catch (err) {
			console.warn("PredictLoop error (continuing):", err);
		}

		requestRef.current = requestAnimationFrame(predictLoop);
	};

	useEffect(() => {
		if (isStreaming && !loading) {
			requestRef.current = requestAnimationFrame(predictLoop);
		} else {
			if (requestRef.current !== null) {
				cancelAnimationFrame(requestRef.current);
			}
		}
		return () => {
			if (requestRef.current !== null) {
				cancelAnimationFrame(requestRef.current);
			}
		};
	}, [isStreaming, loading]);

	return (
		<div className="relative w-full max-w-4xl aspect-video bg-black rounded-lg overflow-hidden shadow-2xl">
			{loading && (
				<div className="absolute inset-0 flex items-center justify-center text-white">
					Loading AI Models...
				</div>
			)}
			<video
				ref={videoRef}
				className="absolute inset-0 w-full h-full object-cover transform -scale-x-100"
				playsInline
				muted
			/>
			<canvas
				ref={canvasRef}
				width={1280}
				height={720}
				className="absolute inset-0 w-full h-full object-cover pointer-events-none"
			/>
		</div>
	);
};

export default SignStream;
