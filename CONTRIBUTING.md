# 📖 Guidelines
-   If the existing tests do not already cover your changes, please add tests.
-   Please run `npm run format` for formatting the code before submitting the pull request.

## ⚒️ Developing the Action code

If you'd like to help us develop and enhance this Action, this section is for you.

To build and run the Action tests, run:

```bash
npm i && npm t
```

## 🚀 Release
1. Create and merge PR to update dependencies and promote version
    * Titled: `Promote version to X.X.X`
    * Update dependencies in `package.json`
    * Update to `version` attribute value to the next version in `package.json`
    * run `npm i` to update and compile the changes
2. [Draft a new release](https://github.com/attiasas/breaking-change-validator/releases/new):
    * Tag version: `vX.X.X`
    * Release title: `vX.X.X`
    * Add release notes in the description.