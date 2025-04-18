<div align="center">

# Breaking-Change-Validator 

</div>

## Table of Contents

-   [Overview](#overview)
-   [Usage](#usage)
-   [Contributions](#contributions)

## Overview

Managing multiple repositories that depend on each other can be challenging, especially when changes in one repository break the functionality of another. This is even more difficult when these repositories are maintained by different teams or individuals.

Breaking-Change-Validator is a GitHub Action designed to address this issue. It validates whether changes in a branch break a dependent library that relies on its interfaces. By integrating this action into your workflow, you can catch breaking changes early in the development process, reducing the risk of discovering issues late in the release cycle or, worse, after deployment.

This action is particularly useful for teams working on interconnected projects, ensuring seamless collaboration and maintaining the integrity of dependent libraries.

### Supported Technologies

|          |                                              |
|----------|----------------------------------------------|
| GoLang   | <img src="resources/icons/go.svg" width="30"> |

## Usage

To use this action in your GitHub workflow, add the following step to your workflow file:
```yml
- uses: attiasas/breaking-change-validator@v1
  with:
    repository: <REPOSITORY_CLONE_URL>
```

Replace `<REPOSITORY_CLONE_URL>` with the clone URL of the repository you want to validate against.

<details>
<summary>Full Workflow Snippet (e.g. .github/workflows/change-validator.yml)</summary>

```yaml
name: Validate breaking depended libraries

on:
  workflow_dispatch:
  pull_request:
    types: [ opened, synchronize ]

jobs:
  validate-depended-libraries:
    name: "Validate if ${{ matrix.library.name }} is broken"
    runs-on: ubuntu-latest
    strategy:
      fail-fast: false
      matrix:
        library:
          - name: 'Go Library'
            url: '<REPOSITORY_CLONE_URL>'
            branch: 'dev'
            test_command: 'go test -v -race ./...'
    steps:
      - uses: actions/checkout@v4

      - uses: attiasas/breaking-change-validator@v1
        with:
          repository: ${{ matrix.library.url }}
          branch: ${{ matrix.library.branch }}
          test_command: ${{ matrix.library.test_command }}

```

</details>


### Inputs

| Name           | Description                                                               | Required | Default         |
|----------------|---------------------------------------------------------------------------|----------|-----------------|
| `repository`   | The clone URL of the dependent repository to validate.                    | Yes      | None            |
| `branch`       | The branch of the dependent repository to validate.                       | No       | Default Branch  |
| `test_command` | Optional shell command to run at the target repository with the changes.  | No       | None            |

## Contributions

We welcome contributions from the community! If you'd like to help us improve this project, please follow these steps:

1. Fork the repository.
2. Create a new branch for your feature or bug fix.
3. Make your changes and ensure all tests pass.
4. Submit a pull request with a clear description of your changes.

For more details, please read our [Contribution Guidelines](./CONTRIBUTING.md#-guidelines).