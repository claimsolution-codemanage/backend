import multer from "multer";
import path from 'path'

    
const storage = multer.diskStorage({ 
    destination: function (req, file, cb) { 
  
        // Uploads is the Upload_folder_name 
        cb(null, 'public/images') 
    }, 
    filename: function (req, file, cb) { 
      cb(null, Date.now() + '-' + file.originalname) 
    } 
  }) 
       
// Define the maximum size for uploading 
// picture i.e. 1 MB. it is optional 
const maxSize = 1 * 1000 * 1000; 
    
const upload = multer({  
    storage: storage, 
    limits: { fileSize: maxSize }, 
    fileFilter: function (req, file, cb){ 
    
        // Set the filetypes, it is optional 
        const filetypes = /jpeg|jpg|png/; 
        const mimetype = filetypes.test(file.mimetype); 
  
        const extname = filetypes.test(path.extname( 
                    file.originalname).toLowerCase()); 
        
        if (mimetype && extname) { 
            return cb(null, true); 
        } 
      
        cb("Error: File upload only supports the "
                + "following filetypes - " + filetypes); 
      }  
}).single("image")

export const imageUpload = async(req,res,next)=>{
    try {
        // Error MiddleWare for multer file upload, so if any 
         // error occurs, the image would not be uploaded! 
         upload(req,res,function(err) { 
             if(err) { 
       
                 // ERROR occurred (here it can be occurred due 
                 // to uploading image of size greater than 
                 // 1MB or uploading different file type) 
                 console.log("image upload error",err);
                 res.status(400).json({success:false,message:"unable to upload img"})
             } 
             else { 
       
                 // SUCCESS, image successfully uploaded 
                 console.log("image upload",req.file.filename);
                 res.status(200).json({success:true,message:"Image uploaded!",url:req.file.filename})
                  
             } 
         }) 
        
    } catch (error) {
        console.log("image error: ",error);
        return res.status(500).json({success: false,message:"Internal server error",error: error});
    }
}