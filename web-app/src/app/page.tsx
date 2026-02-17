"use client";

import React, { useState, useCallback } from "react";
import dynamic from "next/dynamic";
import { PredictionDisplay } from "@/components/feedback/PredictionDisplay";
import { ControlPanel } from "@/components/controls/ControlPanel";

const SignStream = dynamic(
	() => import("@/components/camera/SignStream"),
	{
		ssr: false,
		loading: () => (
			<div className="relative w-full max-w-4xl aspect-video bg-black rounded-lg overflow-hidden shadow-2xl flex items-center justify-center text-white">
				Loading AI Models...
			</div>
		),
	},
);

export default function Home() {
	const [currentResult, setCurrentResult] = useState<string>("");
	const [sentence, setSentence] = useState<string>("");
	const [isStreaming, setIsStreaming] = useState<boolean>(true);

	const handlePrediction = useCallback((char: string) => {
		setCurrentResult(char);
		// Basic sentence construction logic
		setSentence((prev) => {
			// If char is Space (mapped via gesture or button, but here assuming char is letter)
			// If char is same as last char, maybe debounce? unique?
			// Simple append for now
			if (char === "SPACE") return prev + " ";
			// Avoid repeating precise same char immediately if needed?
			// But for "HELLO", we need L L.
			// Usually handled by "pose hold" vs "re-entry".
			return prev + char;
		});
	}, []);

	const handleClear = () => {
		setSentence("");
		setCurrentResult("");
	};

	const handleSpeak = () => {
		if ("speechSynthesis" in window) {
			const utterance = new SpeechSynthesisUtterance(sentence);
			window.speechSynthesis.speak(utterance);
		}
	};

	const handleToggleStream = () => {
		setIsStreaming(!isStreaming);
	};

	return (
		<main className="flex min-h-screen flex-col items-center justify-between p-8 bg-black text-white">
			<div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm lg:flex mb-8">
				<p className="fixed left-0 top-0 flex w-full justify-center border-b border-gray-300 bg-gradient-to-b from-zinc-200 pb-6 pt-8 backdrop-blur-2xl dark:border-neutral-800 dark:bg-zinc-800/30 dark:from-inherit lg:static lg:w-auto  lg:rounded-xl lg:border lg:bg-gray-200 lg:p-4 lg:dark:bg-zinc-800/30">
					SignStream Live &nbsp;
					<code className="font-bold">v1.1.0</code>
				</p>
			</div>

			<div className="relative flex flex-col items-center w-full max-w-5xl">
				<SignStream onPrediction={handlePrediction} isStreaming={isStreaming} />

				<PredictionDisplay currentResult={currentResult} sentence={sentence} />

				<ControlPanel
					onClear={handleClear}
					onSpeak={handleSpeak}
					isStreaming={isStreaming}
					onToggleStream={handleToggleStream}
				/>
			</div>

			<div className="mb-32 grid text-center lg:max-w-5xl lg:w-full lg:mb-0 lg:grid-cols-4 lg:text-left">
				{/* Footer content if needed */}
			</div>
		</main>
	);
}
