// ONNX Runtime - loaded via CDN
// Uses cdnImport to bypass Turbopack's static import() analysis

import { cdnImport } from "./cdn-import";

const ORT_CDN =
	"https://cdn.jsdelivr.net/npm/onnxruntime-web@1.21.0/dist/ort.all.min.mjs";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let ortModule: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let session: any = null;

// Sign MNIST label mapping: 0-24 → A-Y, skipping J (9) and Z (25)
// Labels 0-8 = A-I, labels 9-24 = K-Y
const SIGN_MNIST_LABELS = [
	"A", "B", "C", "D", "E", "F", "G", "H", "I",
	"K", "L", "M", "N", "O", "P", "Q", "R", "S",
	"T", "U", "V", "W", "X", "Y",
];

const getOrt = async () => {
	if (ortModule) return ortModule;
	ortModule = await cdnImport(ORT_CDN);
	return ortModule;
};

export const loadModel = async () => {
	if (session) return session;

	const ort = await getOrt();

	// Point WASM files to the CDN so the browser can fetch them
	ort.env.wasm.wasmPaths =
		"https://cdn.jsdelivr.net/npm/onnxruntime-web@1.21.0/dist/";

	try {
		session = await ort.InferenceSession.create("/models/model.onnx", {
			executionProviders: ["wasm"],
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

	const ort = await getOrt();

	try {
		const data = Float32Array.from(flattenedLandmarks);
		const tensor = new ort.Tensor("float32", data, [1, 63]);

		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const feeds: Record<string, any> = {};
		const inputName = session.inputNames[0];
		feeds[inputName] = tensor;

		const results = await session.run(feeds);

		const outputName = session.outputNames[0];
		const output = results[outputName];

		if (output.type === "int64" || output.type === "int32") {
			const classIndex = Number(output.data[0]);
			return SIGN_MNIST_LABELS[classIndex] || "?";
		}

		const label = Number(output.data[0]);
		return SIGN_MNIST_LABELS[label] || "?";
	} catch (e) {
		console.error("Inference failed", e);
		return null;
	}
};
