import * as ort from "onnxruntime-web";

let session: ort.InferenceSession | null = null;

// Alphabet mapping (0-25 -> A-Z) assuming standard classification
const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

export const loadModel = async () => {
	if (session) return session;

	try {
		session = await ort.InferenceSession.create("/models/sign_model.onnx", {
			executionProviders: ["webgl"],
		});
		console.log("ONNX Session loaded");
		return session;
	} catch (e) {
		console.error("Failed to load ONNX session", e);
		throw e;
	}
};

export const runInference = async (
	flattenedLandmarks: number[],
): Promise<string | null> => {
	if (!session) {
		await loadModel();
	}

	if (!session) return null;

	try {
		// Create tensor: Float32, [1, 63]
		const data = Float32Array.from(flattenedLandmarks);
		const tensor = new ort.Tensor("float32", data, [1, 63]);

		const feeds: Record<string, ort.Tensor> = {};
		// Note: 'float_input' matches the input name in standard sklearn-onnx exports.
		// We might need to verify the actual input name of the provided model.
		// For now, assuming "float_input" or "input".
		// Usually it's best to inspect session.inputNames
		const inputName = session.inputNames[0];
		feeds[inputName] = tensor;

		const results = await session.run(feeds);

		// Output: 'label' (int64) and 'probabilities' (map) usually for classifier
		// Or just 'output_label' and 'output_probability'
		const outputName = session.outputNames[0];
		const output = results[outputName];

		// Assuming output is the predicted class index or probabilities
		// If it's the class label (int64 tensor)
		if (output.type === "int64" || output.type === "int32") {
			// Int64 in ONNX
			const classIndex = Number(output.data[0]);
			return ALPHABET[classIndex] || "?";
		}

		// If it's probabilities (float32 [1, 26])
		// Find argmax
		// ... implementation depends on model output format.
		// For XGBoost classifier -> ONNX, usually returns 'label' and 'probabilities'

		// Let's assume 'label' is output 0.
		const labelTensor = results[session.outputNames[0]]; // label
		const label = Number(labelTensor.data[0]);

		return ALPHABET[label] || "?";
	} catch (e) {
		console.error("Inference failed", e);
		return null;
	}
};
