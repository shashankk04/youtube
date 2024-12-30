import { Router } from "express";
import {
  loginUser,
  registerUser,
  refreshAccessToken,
  changeCurrentPassword,
  getCurrentUser,
  updateAccount,
  updateUserAvatar,
  updateUserCoverImage,
  getUserChannelProfile,
  getWatchHistory,
} from "../controllers/user.controller.js";
import {upload} from "../middlewares/multer.middleware.js";
import { verifyJwt } from "../middlewares/auth.middleware.js";
 

const router = Router();
router.route("/register").post(
  upload.fields([
    {
      name: "avatar",
      maxCount: 1,
    },
    {
      name: "coverImage",
      maxCount: 1,
    },
  ]),
  registerUser
);
router.route("/login").post(loginUser);


router.route("/logout").post(verifyJwt,logoutUser);
router.route("/refresh-token").post(refreshAccessToken);
router.route("/change-password").put(verifyJwt,changeCurrentPassword);
router.route("current-user").get(verifyJwt,getCurrentUser);
router.route("/update-account").patch(verifyJwt,updateAccount);
router.route("/avatar").patch(verifyJwt,upload.single("avatar"),updateUserAvatar);
router.route("/cover-image").patch(verifyJwt,upload.single("coverImage"),updateUserCoverImage);
router.route("/channel/:username").get(getUserChannelProfile);
router.route("/history").get(verifyJwt,getWatchHistory);







export default router;
