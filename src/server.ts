import { Server } from "http";
import mongoose from "mongoose";
import app from "./app";
import config from "./config";
import seedDatabase from "./DB";
import { ensureTtlIndexes } from "./DB/ensureTtlIndexes";

let server: Server;

function describeMongoAuthError(err: unknown) {
  const anyErr = err as any;
  const message = typeof anyErr?.message === "string" ? anyErr.message : "";
  const codeName = typeof anyErr?.codeName === "string" ? anyErr.codeName : "";
  const errMsg = typeof anyErr?.errorResponse?.errmsg === "string" ? anyErr.errorResponse.errmsg : "";

  const isBadAuth =
    message.toLowerCase().includes("bad auth") ||
    errMsg.toLowerCase().includes("bad auth") ||
    codeName === "AtlasError";

  if (!isBadAuth) return null;

  return [
    "MongoDB authentication failed.",
    "Most common fixes:",
    "- Reset the Atlas DB user's password and update your `.env`.",
    "- Ensure the DB user exists in Atlas (Database Access) and has permissions.",
    "- If your password contains special characters, it must be URL-encoded (or use MONGO_USER/MONGO_PASSWORD vars).",
    "- If you created the user in `admin`, ensure `authSource=admin` is set (this project auto-adds it).",
  ].join("\n");
}

async function main() {
  try {
    if (!config.MONGO_URI) {
      throw new Error("MONGO_URI is not configured. Set MONGO_URI (or MONGODB_URI) in .env");
    }
    const dbConnection = await mongoose.connect(config.MONGO_URI as string);
    // console.log(dbConnection.connection.host);
    console.log("Connected to database");
    await ensureTtlIndexes();
    await seedDatabase();

    // start server
    server = app.listen(config.PORT, () => {
      console.log(`Server running on port ${config.PORT}`);
    });
    
  } catch (error) {
    // log any errors that occur during server startup
    const friendly = describeMongoAuthError(error);
    if (friendly) {
      console.error(friendly);
    }
    console.log(error);
    process.exit(1);
  }
}

// call the main function
main();

// handle unhandled promise rejections
process.on("unhandledRejection", (err: any) => {
  console.log(
    "😡unhandledRejection: Error name: ",
    err.name,
    " Message: ",
    err.message
  );

  console.log("Server shutting down...");

  // close server
  if (server) {
    server.close(() => {
      process.exit(1);
    });
  } else {
    process.exit(1);
  }
});

// handle uncaught exceptions
process.on("uncaughtException", (err: any) => {
  console.log(
    "😡uncaughtException: Error name: ",
    err.name,
    " Message: ",
    err.message
  );
  console.log("Server shutting down...");

  // close server
  if (server) {
    server.close(() => {
      process.exit(1);
    });
  } else {
    process.exit(1);
  }
});
