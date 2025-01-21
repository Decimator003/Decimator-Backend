import multer from "multer";

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, "./public/temp");
    },
    filename: function (req, file, cb) {
        cb(null, file.originalname);  //cb is callback function, has to be called with null and the file name
    },
});

export const upload = multer({storage});