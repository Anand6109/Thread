const logError = (context, error) => {
  const details = [error?.name || "UnknownError"];
  if (typeof error?.code === "string" || typeof error?.code === "number") {
    details.push(String(error.code));
  }
  console.error(`${context}: ${details.join(" ")}`);
};

module.exports = logError;
