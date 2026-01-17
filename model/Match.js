import mongoose from "mongoose";

const MatchSchema = new mongoose.Schema({
  users: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  interestSentBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }]
}, { timestamps: true });

export default mongoose.model("Match", MatchSchema);
