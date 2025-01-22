import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const registerUser = asyncHandler(async (req, res) => {
    //get user details from frontend
    //check data is valid / validation
    //check if user already exists : both username and email
    //check for images, check for avatar -> multer for file upload // middleware
    //upload images to cloudinary, avatar
    //create user object - create entry in Db
    //remove password and refresh token from response
    //check for user creation
    //return response

    const {fullname, email, username, password} = req.body

    if(
        [fullname, email, username, password].some((field) => field?.trim() === '')
    ){
        throw new ApiError(400, 'All fields are required')
    }

    const existeduser = User.findOne({
        $or: [{username}, {email}]
    })

    if(existeduser){
        throw new ApiError(409, 'User already exists with the same username or email')
    }

    const avatarLocalPath = req.files?.avatar[0]?.path;
    const coverImageLocalPath = req.files?.coverImage[0]?.path;

    if(!avatarLocalPath || !coverImageLocalPath){
        throw new ApiError(400, 'All fields are required')
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath);
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);

    if(!avatar){
        throw new ApiError(400, 'Avatar file is required')
    }

    const User = await User.create({
        fullname,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        password,
        username: username.toLowerCase()
    })

    const createdUser = await User.findById(User._id).select(
        "-password -refreshToken"
    )

    if(!createdUser){
        throw new ApiError(500, 'Something went wrong while registering user')
    }

    return res.status(201).json(
        new ApiResponse(201, createdUser, 'User registered successfully')
    )

});

export { registerUser };