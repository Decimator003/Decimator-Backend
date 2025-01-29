import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";


const generateAccessAndRefreshTokens = async(userId) => {
    try{
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        user.refreshToken = refreshToken
        await user.save({validateBeforeSave: false})

        return {accessToken, refreshToken}

    }catch(error){
        throw new ApiError(500, 'Something went wrong while generating tokens')
    }
}

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

    const existeduser = await User.findOne({
        $or: [{username}, {email}]
    })

    if(existeduser){
        throw new ApiError(409, 'User already exists with the same username or email')
    }

    const avatarLocalPath = req.files?.avatar[0]?.path;
    //const coverImageLocalPath = req.files?.coverImage[0]?.path;

    let coverImageLocalPath;
    if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0){
        coverImageLocalPath = req.files.coverImage[0].path;
    }

    if(!avatarLocalPath || !coverImageLocalPath){
        throw new ApiError(400, 'All fields are required')
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath);
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);

    if(!avatar){
        throw new ApiError(400, 'Avatar file is required')
    }

    const user = await User.create({
        fullname,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        password,
        username: username.toLowerCase()
    })

    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    if(!createdUser){
        throw new ApiError(500, 'Something went wrong while registering user')
    }

    return res.status(201).json(
        new ApiResponse(201, createdUser, 'User registered successfully')
    )

});

const loginUser = asyncHandler(async(req,res) => {
    //req body -> data
    //username or email
    //find user
    //password match
    //access and refresh token
    //send cookies

    const {email, username, password} = req.body;

    if (!(username || email)){
        throw new ApiError(400, 'Username or email are required')
    }

    const user = await User.findOne({   // to search in both username and email
        $or: [{email}, {username}]
    })

    if(!user){
        throw new ApiError(404, 'User not found')
    }

    const isPasswordValid = await user.isPassWordCorrect(password)

    if(!isPasswordValid){
        throw new ApiError(401, 'Invalid credentials')
    }

    const {accessToken, refreshToken} = await generateAccessAndRefreshTokens(user._id)

    const loggedInUser = User.findById(user._id).select("-password -refreshToken")
    const options = {
        httpOnly: true,
        secure:  true,
    }

    return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
        new ApiResponse(
            200,{
                user: loggedInUser, accessToken, refreshToken
            },
            "User logged in successfully"
        )
    )

})

const logoutUser = asyncHandler(async(res, req) => {
    //clear cookies
    //remove refresh token from db
    //send response
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set:{
                refreshToken: undefined
            }
        },
        {
            new: true
        }
    )
    const options = {
        httpOnly: true,
        secure:  true,
    }

    return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(
        new ApiResponse(200, {}, "User logged out successfully")
    )
})

export { 
    registerUser,
    loginUser,
    logoutUser
 };