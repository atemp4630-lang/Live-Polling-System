const validatePoll = (req, res, next) => {
  const { question, options, duration } = req.body;

  // Validate question
  if (
    !question ||
    typeof question !== "string" ||
    question.trim().length === 0
  ) {
    return res
      .status(400)
      .json({ error: "Question is required and must be a non-empty string" });
  }

  if (question.length > 500) {
    return res
      .status(400)
      .json({ error: "Question must be 500 characters or less" });
  }

  // Validate options
  if (!options || !Array.isArray(options) || options.length < 2) {
    return res.status(400).json({ error: "At least 2 options are required" });
  }

  if (options.length > 6) {
    return res.status(400).json({ error: "Maximum 6 options allowed" });
  }

  // Validate each option
  for (let i = 0; i < options.length; i++) {
    const option = options[i];
    if (!option || typeof option !== "string" || option.trim().length === 0) {
      return res.status(400).json({
        error: `Option ${i + 1} is required and must be a non-empty string`,
      });
    }

    if (option.length > 200) {
      return res
        .status(400)
        .json({ error: `Option ${i + 1} must be 200 characters or less` });
    }
  }

  // Check for duplicate options
  const uniqueOptions = [
    ...new Set(options.map((opt) => opt.trim().toLowerCase())),
  ];
  if (uniqueOptions.length !== options.length) {
    return res.status(400).json({ error: "Duplicate options are not allowed" });
  }

  // Validate duration
  if (duration !== undefined) {
    if (typeof duration !== "number" || duration < 10 || duration > 600) {
      return res.status(400).json({
        error: "Duration must be a number between 10 and 600 seconds",
      });
    }
  }

  next();
};

const validateMessage = (req, res, next) => {
  const { content } = req.body;

  if (!content || typeof content !== "string" || content.trim().length === 0) {
    return res.status(400).json({ error: "Message content is required" });
  }

  if (content.length > 1000) {
    return res
      .status(400)
      .json({ error: "Message must be 1000 characters or less" });
  }

  next();
};

module.exports = {
  validatePoll,
  validateMessage,
};
