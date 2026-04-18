module.exports = {
  extends: ["@commitlint/config-conventional"],
  rules: {
    "type-enum": [
      2,
      "always",
      ["feat", "fix", "chore", "refactor", "docs", "test", "perf", "build", "ci", "style", "revert"],
    ],
    "subject-case": [0],
    "body-max-line-length": [0],
  },
};
