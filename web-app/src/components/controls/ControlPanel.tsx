import React from "react";
import { Button } from "@/components/ui/button";
import { Volume2, Trash2, StopCircle, PlayCircle } from "lucide-react";

interface ControlPanelProps {
	onClear: () => void;
	onSpeak: () => void;
	isStreaming: boolean;
	onToggleStream: () => void;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({
	onClear,
	onSpeak,
	isStreaming,
	onToggleStream,
}) => {
	return (
		<div className="flex items-center gap-4 mt-6">
			<Button
				variant={isStreaming ? "destructive" : "default"}
				onClick={onToggleStream}
				className="w-32"
			>
				{isStreaming ? (
					<>
						<StopCircle className="mr-2 h-4 w-4" /> Stop
					</>
				) : (
					<>
						<PlayCircle className="mr-2 h-4 w-4" /> Start
					</>
				)}
			</Button>

			<div className="flex-1" />

			<Button variant="outline" onClick={onClear}>
				<Trash2 className="mr-2 h-4 w-4" /> Clear
			</Button>

			<Button onClick={onSpeak}>
				<Volume2 className="mr-2 h-4 w-4" /> Speak
			</Button>
		</div>
	);
};
