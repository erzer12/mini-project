"use client";

import React, { useRef, useEffect, useState } from "react";
import { getHandLandmarker } from "@/lib/mediapipe";
import { normalizeLandmarks } from "@/lib/normalization";
import { runInference } from "@/lib/onnx-inference";
import { MajorityVoteBuffer } from "@/lib/buffer-utils";
import { Button } from "@/components/ui/button";
import { DrawingUtils, HandLandmarker } from "@mediapipe/tasks-vision";

interface SignStreamProps {
	onPrediction: (char: string) => void;
	isStreaming: boolean;
}

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

	useEffect(() => {
		const init = async () => {
			// Initialize Camera
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
			// Cleanup stream
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

		if (video.currentTime !== lastVideoTimeRef.current) {
			lastVideoTimeRef.current = video.currentTime;

			const handLandmarker = await getHandLandmarker();
			if (handLandmarker) {
				const results = handLandmarker.detectForVideo(video, performance.now());

				const ctx = canvas.getContext("2d");
				if (ctx) {
					ctx.save();
					ctx.clearRect(0, 0, canvas.width, canvas.height);
					// Mirror flip
					ctx.scale(-1, 1);
					ctx.translate(-canvas.width, 0);

					if (results.landmarks) {
						const drawingUtils = new DrawingUtils(ctx);
						for (const landmarks of results.landmarks) {
							// Draw landmarks
							drawingUtils.drawConnectors(
								landmarks,
								HandLandmarker.HAND_CONNECTIONS,
								{
									color: "#00FF00",
									lineWidth: 5,
								},
							);
							drawingUtils.drawLandmarks(landmarks, {
								color: "#FF0000",
								lineWidth: 2,
							});

							// Inference logic
							const normalized = normalizeLandmarks(landmarks);
							const char = await runInference(normalized);

							if (char) {
								buffer.current.add(char);
								const stable = buffer.current.getStablePrediction();
								if (stable) {
									onPrediction(stable);
									// Optional: clear buffer after stable prediction?
									// Or debounce at parent level.
									// For streaming, usually we want continuous updates or robust debounce.
									// Let's keep buffer but maybe only trigger update if different?
									// The buffer itself is a rolling window, so it will keep outputting 'A' as long as 'A' is stable.
								}
							}
						}
					}
					ctx.restore();
				}
			}
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
