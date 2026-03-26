import mongoose from "mongoose";
import app from "../src/app";
import seedSuperAdmin from "../src/DB";
import config from "../src/config";

let isConnected = false;
let connectPromise: Promise<typeof mongoose> | null = null;

const connectDB = async () => {
	if (isConnected) return;

	if (!config.MONGO_URI) {
		throw new Error("MONGO_URI is not configured");
	}

	if (!connectPromise) {
		connectPromise = mongoose.connect(config.MONGO_URI);
	}

	await connectPromise;
	isConnected = true;
	await seedSuperAdmin();
};

export default async function handler(req: any, res: any) {
	await connectDB();
	return app(req, res);
}
