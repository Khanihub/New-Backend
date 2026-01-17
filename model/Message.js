import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    match: { type: mongoose.Schema.Types.ObjectId, ref: "Match", required: true },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    text: { type: String, required: true }
  },
  { timestamps: true }
);

export default mongoose.model("Message", messageSchema);
