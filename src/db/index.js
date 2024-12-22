import mongoose from "mongoose";
import {DB_NAME} from "../constants.js";

const connectDB = async ()=>{
    try{
        const connectionInstance = await mongoose.connect(
          `mongodb+srv://shiv04313:stars123@cluster0.dno0w.mongodb.net/videotube`
        );
        console.log(`\nConnection to database established: ${connectionInstance.connection.host}`)
    }catch(error){
        console.error("ERROR:",error)
        process.exit(1)
    }
}


export default connectDB