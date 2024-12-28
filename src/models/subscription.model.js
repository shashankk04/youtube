import mongoose, {Schema} from "mongoose";

const subscriptionSchema = new Schema(
    {
        subscriber:{
            type: Schema.Types.ObjectId,
            ref: "User",
            required:true
        },
        channel:{
            type: Schema.Types.ObjectId,
            ref: "User",
            required:true
        }
    },
    {
        timestamps: true
    }
);

export const Subsription = mongoose.model("Subscription",subscriptionSchema);