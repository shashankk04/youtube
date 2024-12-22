import {asyncHandler} from "../utils/asynchandler.js";
import {ApiError} from "../utils/ApiError.js";
import {User} from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import {ApiResponse} from "../utils/ApiResponse.js";


const registerUser = asyncHandler(async(req,res)=>{
    const {fullname,email,username,password} = req.body;
    //console.log(fullname,email,username,password);
    // if(fullname === ""){
    //     throw new ApiError(400,"fullname is important");
    // }
    if(
        [fullname,email,username,password].some((field)=>
            field?.trim() === "")
    )
    {
            throw new ApiError(400,"All fields are required");
    }

    const existedUser = User.findOne({
        $or:[{email},{username}]
    })
    if(existedUser){
        throw new ApiError(409,"User already exists");
    }


    const avatarLocalPath = req.files?.avatar[0]?.path;
    const coverImageLocalPath = req.files?.coverImage[0]?.path;

    if(!avatarLocalPath){
        throw new ApiError(400,"Avatar is required");
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath);
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);
    if(!avatar){
        throw new ApiError(400,"Avatar file required");
    };
    const user = await User.create({
        fullname,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        password,
        username : username.toLowerCase()
    })
    const createdUser = await User.findById(user._id).select(
      "-password -refreshToken"
    );
    if(!createdUser){
        throw new ApiError(500,"User not created");
    }
    return res.status(201).json(new ApiResponse(201,createdUser,"User created"));


})


export {registerUser}