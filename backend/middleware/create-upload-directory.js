const fs = require('fs');

const createUploadDirectory = () => {
  console.log('Creating upload directory...');
  const uploadDirectory = 'Upload';
  const imagesDirectory = 'Upload/Images';
  const videosDirectory = 'Upload/Videos';
  try {
    // Check if the main upload directory exists
    if (!fs.existsSync(uploadDirectory)) {
      // If not, create it
      fs.mkdirSync(uploadDirectory, { recursive: true });
      console.log(`${uploadDirectory} directory created.`);
    }

    // Check if the images directory exists
    if (!fs.existsSync(imagesDirectory)) {
      // If not, create it
      fs.mkdirSync(imagesDirectory, { recursive: true });
      console.log(`${imagesDirectory} directory created.`);
    }

    // Check if the videos directory exists
    if (!fs.existsSync(videosDirectory)) {
      // If not, create it
      fs.mkdirSync(videosDirectory, { recursive: true });
      console.log(`${videosDirectory} directory created.`);
    }
  } catch (error) {
    console.error('Error creating upload directories:', error);
  }
};

module.exports = createUploadDirectory;
