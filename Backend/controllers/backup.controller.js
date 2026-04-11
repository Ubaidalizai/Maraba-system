const { exec } = require("child_process");
const path = require("path");
const fs = require("fs");

const asyncHandler = require("../middlewares/asyncHandler");
const AppError = require("../utils/appError");

const BACKUP_DIR = path.join(__dirname, "../backups");
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR); // Create the directory if it doesn't exist
}

exports.backupDatabase = asyncHandler(async (req, res) => {
  // Define the backup file name and path
  const backupFile = `mongodb_backup_${Date.now()}.gz`;
  const backupPath = path.join(BACKUP_DIR, backupFile);

  // Command to create a MongoDB backup
  const command = `mongodump --uri="mongodb://localhost:27017/Inventory" --archive="${backupPath}" --gzip`;

  // Execute the backup command
  exec(command, (error) => {
    if (error) {
      console.error("Backup failed:", error);
      throw new AppError("Backup failed", 500);
    }

    // Send the backup file to the client
    res.download(backupPath, backupFile, (err) => {
      if (err) {
        throw new AppError("Failed to send backup file", 500);
      }

      // Delete the backup file from the server after download
      if (fs.existsSync(backupPath)) {
        fs.unlinkSync(backupPath);
        console.log("Backup file deleted from server:", backupPath);
      }
    });
  });
});
