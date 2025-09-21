import mongoose from "mongoose";

export const isValidMongoId = (_id)=> mongoose.Types.ObjectId.isValid(_id)