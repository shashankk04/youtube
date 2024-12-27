
import connectDB from "./db/index.js";
import { app } from "./app.js";

import dotenv from 'dotenv';  // Import dotenv
dotenv.config({ path: "../.env" });  // Load environment variables
connectDB()
  .then(() => {
    app.listen(process.env.PORT || 8000, () => {
      console.log(`Server is running on port ${process.env.PORT || 8000}`);
    });
  })
  .catch((err) => {
    console.log("Error: ", err);
  });

// const app = express();
// ( async () => {
//     try{
//         await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
//         app.on("error",()=>{
//             console.log("Error: ",error)
//             throw error
//         })
//         app.listen(process.env.PORT,()=>{
//             console.log(`Server is running on port ${process.env.PORT}`)
//         })
//     }catch(error){
//         console.error("ERROR:",error)
//         throw err
//     }
// })()
