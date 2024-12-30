import {asyncHandler} from "../utils/asynchandler.js";
import {ApiError} from "../utils/ApiError.js";
import {User} from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import {ApiResponse} from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";
const generateAccessAndRefreshTokens = async(userId)=>{
  try{
    const user = await User.findById(userId);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save({validateBeforeSave:false});

    return {accessToken,refreshToken};
  }
  catch(error){
    throw new ApiError(500,"Failed to generate tokens");
  }
}

const registerUser = asyncHandler(async (req, res) => {
  const { fullname, email, username, password } = req.body;

  // Check for missing required fields
  if (
    [fullname, email, username, password].some(
      (field) => field?.trim() === undefined
    )
  )
    {throw new ApiError(400, "All fields are required");
}
  // Check if user already exists
  const existedUser = await User.findOne({
    $or: [{ email }, { username }],
  });
  if (existedUser) {
    throw new ApiError(409, "User already exists");
  }

  // Safely access avatar and coverImage paths
  const avatarLocalPath = req.files?.avatar?.[0]?.path;
  const coverImageLocalPath = req.files?.coverImage?.[0]?.path;

  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar is required");
  }
  console.log("Avatar local path:", avatarLocalPath);
  console.log("Cover image local path:", coverImageLocalPath);

  // Upload images to Cloudinary
  const avatar = await uploadOnCloudinary(avatarLocalPath);
  const coverImage = coverImageLocalPath
    ? await uploadOnCloudinary(coverImageLocalPath)
    : null;

  if (!avatar) {
    throw new ApiError(400, "Failed to upload avatar");
  }

  // Create user
  const user = await User.create({
    fullname,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
    email,
    password,
    username: username.toLowerCase(),
  });

  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );
  if (!createdUser) {
    throw new ApiError(500, "User not created");
  }

  return res
    .status(201)
    .json(new ApiResponse(201, createdUser, "User created"));
});

const loginUser = asyncHandler(async(req,res)=>{
    const {email,username,password} = req.body;
    if(!(email || username)){
        throw new ApiError(400,"Email or username is required");
    }

    const user  = User.findOne({$or:[{email},{username}]});

    if(!user){
        throw new ApiError(404,"User not found");
    };

    const isPasswordValid =  await user.isPasswordCorrect(password);

    if(!isPasswordValid){
        throw new ApiError(401,"Invalid password");
    };

    const {accessToken,refreshToken} = await generateAccessAndRefreshTokens(user._id);

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken");

    const options ={
      httpOnly:true,
      secure:true
    };
    return res
    .status(200)
    .cookie("accessToken",accessToken,options)
    .cookie("refreshToken",refreshToken,options)
    .json(new ApiResponse(200,{user:loggedInUser,accessToken,refreshToken},"User logged in"));


});
const logoutUser = asyncHandler(async(req,res)=>{
    User.findByIdAndUpdate(
      req.user._id,
      {
        $set:{
          refreshToken:undefined
        }
      },
      {
        new:true
      }
    )
    const options = {
      httpOnly: true,
      secure: true,
    };
    return res
     .status(200)
      .clearCookie("accessToken",options)
      .clearCookie("refreshToken",options)
      .json(new ApiResponse(200,{},"User logged out"));
});

const refreshAccessToken = asyncHandler(async(req,res)=>{
  const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken;
  if(!incomingRefreshToken){
    throw new ApiError(401,"Unauthorized Request");
  }
  const decodedToken = jwt.verify(incomingRefreshToken, process.env.ACCESS_TOKEN_SECRET);

  const user = await User.findById(decodedToken._id);
  if(!user){
    throw new ApiError(401,"Unauthorized Request");
  }
  if(incomingRefreshToken!==user?.refreshToken){
    throw new ApiError(401,"refresh token is expired");
  }
  

  const options ={
    httpOnly:true,
    secure:true
  }
  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
    user._id
  );
  return res
  .status(200)
  .cookie("accessToken",accessToken,options)
  .cookie("refreshToken",refreshToken,options)
  .json(new ApiResponse(200,{accessToken,refreshToken},"Access token refreshed"));

});

const changeCurrentPassword = asyncHandler(async(req,res)=>{
  const {oldPassword,newPassword} = req.body;
  const user = await User.findById(req.user._id);
  const isPasswordCorrect =  await user.isPasswordCorrect(oldPassword);
  if(!isPasswordCorrect){
    throw new ApiError(401,"Invalid password");
  }
  user.password = newPassword;
  await user.save({validateBeforeSave:false});
  return res.status(200).json(new ApiResponse(200,{},"Password changed successfully"));
});

const getCurrentUser = asyncHandler(async(req,res)=>{
  return res.status(200)
  .json(new ApiResponse(200,req.user,"User found"));
})

const updateAccount = asyncHandler(async(req,res)=>{
  const {fullname,email} = req.body;
  if(!fullname || !email){
    throw new ApiError(400,"At least one field is required");
  }
  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set:{
        fullname,
        email
      }
    },
    {
      new:true
    }
  ).select("-password");
  return res
  .status(200)
  .json(new ApiResponse(200,user,"Account updated successfully"));

});

const updateUserAvatar = asyncHandler(async(req,res)=>{
  const avatarLocalPath = req.file?.path;
  if(!avatarLocalPath){
    throw new ApiError(400,"Avatar is required");
  }
  const avatar = await uploadOnCloudinary(avatarLocalPath);
  if(!avatar.url){
    throw new ApiError(400,"Failed to upload avatar");
  }
  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set:{
        avatar:avatar.url
      }
    },
    {
      new:true
    }
  ).select("-password");
  return res 
  .status(200)
  .json(new ApiResponse(200,user,"Avatar updated successfully"));



});

const updateUserCoverImage = asyncHandler(async (req, res) => {
  const coverImagePath = req.file?.path;
  if (!coverImagePath) {
    throw new ApiError(400, "Avatar is required");
  }
  const coverImage = await uploadOnCloudinary(coverImagePath);
  if (!coverImage.url) {
    throw new ApiError(400, "Failed to upload avatar");
  }
  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        coverImage: coverImage.url,
      },
    },
    {
      new: true,
    }
  ).select("-password");
  return res
    .status(200)
    .json(new ApiResponse(200, user, "Cover image updated successfully"));
});

const getUserChannelProfile = asyncHandler(async(req,res)=>{
  const {username} = req.params;
  if(!username)
  {
    throw new ApiError(400,"Username is required");
  }
  const channel = await User.aggregrate([
    {
      $match: {
        username: username?.toLowerCase(),
      },
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "channel",
        as: "subscribers",
      },
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "subscriber",
        as: "subscribedTo",
      },
    },
    {
      $addFields:{
        subscribersCount:{$size:"$subscribers"},
        channelsSubscribedToCount:{$size:"$subscribedTo"},
        isSubscribed:{
          $cond:{
            if:{$in:[req.user?._is,"$subscribers.subscriber"]},
            then:true,
            else:false
          }
        }
      }
    },
    {
      $project:{
        fullname:1,
        username:1,
        subscribersCount:1,
        channelsSubscribedToCount:1,
        isSubscribed:1,
        coverImage:1,
        avatar:1, 
        password:0,
        refreshToken:0,
      }
    }
  ]);
  if(!channel?.length){
    throw new ApiError(404,"Channel not found");
  }
  return res
  .status(200)
  .json(new ApiResponse(200,channel[0],"Channel found"));
});

const getWatchHistory = asyncHandler(async(req,res)=>{
  const user = await User.aggregrate([
    {
      $match:{
        _id:new mongoose.Types.ObjectId(req.user._id)
      },
      $lookup:{
        from:"videos",
        localField:"watchHistory",
        foreignField:"_id",
        as:"watchHistory",
        pipeline:[
          {
            $lookup:{
              from:"users",
              localField:"owner",
              foreignField:"_id",
              as:"owner",
              pipelin:[
                {
                  $project:{
                    fullname:1,
                    username:1,
                    avatar:1
                  }
                }
              ]
            }
          },
          {
            addFields:{
              owner:{
                $first:"$owner"
              }
            }
          }
        ]
      }
    }
  ])
  return res
  .status(200)
  .json(new ApiResponse(200,user[0].watchHistory,"Watch history found"));
});



export {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  changeCurrentPassword,
  getCurrentUser,
  updateAccount,
  updateUserAvatar,
  updateUserCoverImage,
  getUserChannelProfile,
  getWatchHistory,
};