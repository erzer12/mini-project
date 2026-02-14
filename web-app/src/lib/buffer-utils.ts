export class MajorityVoteBuffer {
	private buffer: string[];
	private maxSize: number;

	constructor(maxSize: number = 10) {
		this.buffer = [];
		this.maxSize = maxSize;
	}

	add(prediction: string) {
		this.buffer.push(prediction);
		if (this.buffer.length > this.maxSize) {
			this.buffer.shift();
		}
	}

	getStablePrediction(): string | null {
		if (this.buffer.length < this.maxSize) return null;

		const counts: Record<string, number> = {};
		let maxCount = 0;
		let maxChar = "";

		for (const char of this.buffer) {
			counts[char] = (counts[char] || 0) + 1;
			if (counts[char] > maxCount) {
				maxCount = counts[char];
				maxChar = char;
			}
		}

		// Threshold: 80% consensus
		if (maxCount >= this.maxSize * 0.8) {
			return maxChar;
		}

		return null;
	}

	clear() {
		this.buffer = [];
	}
}
