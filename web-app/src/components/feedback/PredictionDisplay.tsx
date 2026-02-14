import React from "react";
import { Card, CardContent } from "@/components/ui/card";

interface PredictionDisplayProps {
	currentResult: string;
	sentence: string;
}

export const PredictionDisplay: React.FC<PredictionDisplayProps> = ({
	currentResult,
	sentence,
}) => {
	return (
		<div className="w-full max-w-4xl mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
			<Card className="md:col-span-1 bg-slate-900 border-slate-700">
				<CardContent className="flex flex-col items-center justify-center h-40 p-6">
					<h3 className="text-slate-400 text-sm uppercase tracking-wider mb-2">
						Current Sign
					</h3>
					<div className="text-6xl font-black text-green-400">
						{currentResult || "-"}
					</div>
				</CardContent>
			</Card>

			<Card className="md:col-span-2 bg-slate-900 border-slate-700">
				<CardContent className="flex flex-col justify-start h-40 p-6">
					<h3 className="text-slate-400 text-sm uppercase tracking-wider mb-2">
						Transcript
					</h3>
					<div className="text-2xl font-medium text-white break-words">
						{sentence}
						<span className="inline-block w-2 h-6 ml-1 bg-green-500 animate-pulse align-middle" />
					</div>
				</CardContent>
			</Card>
		</div>
	);
};
