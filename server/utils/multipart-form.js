const formidable = require("formidable");
const fs = require("fs/promises");

const parseMultipartForm = (request) =>
  new Promise((resolve, reject) => {
    let fileCount = 0;
    let rejectedFile = false;
    const form = formidable({
      maxFileSize: 5 * 1024 * 1024,
      maxFields: 5,
      maxFieldsSize: 16 * 1024,
      multiples: false,
      filter: ({ originalFilename, mimetype }) => {
        if (!originalFilename) {
          return true;
        }
        fileCount += 1;
        const accepted =
          fileCount === 1 &&
          ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"].includes(
            mimetype
          );
        rejectedFile ||= !accepted;
        return accepted;
      },
    });
    form.parse(request, (error, fields, files) => {
      if (error) {
        removeTemporaryFiles(files || {}).catch(() => {
          console.error("Failed to clean up a rejected temporary upload.");
        });
        reject(error);
        return;
      }
      if (rejectedFile) {
        removeTemporaryFiles(files || {}).catch(() => {
          console.error("Failed to clean up a rejected temporary upload.");
        });
        reject(Object.assign(new Error("Only one image file is allowed."), { status: 415 }));
        return;
      }
      resolve({ fields, files });
    });
  });

const firstFormValue = (value) => (Array.isArray(value) ? value[0] : value);

const removeTemporaryFiles = async (files) => {
  const uploadedFiles = Object.values(files).flat();
  await Promise.all(
    uploadedFiles.map(async (file) => {
      try {
        await fs.unlink(file.filepath);
      } catch (error) {
        if (error.code !== "ENOENT") {
          throw error;
        }
      }
    })
  );
};

module.exports = {
  firstFormValue,
  parseMultipartForm,
  removeTemporaryFiles,
};
