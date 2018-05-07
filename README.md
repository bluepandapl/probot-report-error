# Probot: Report Error

A [Probot](https://probot.github.io) extension to report errors that occur in apps by creating an issue on the target repository.

## Installation

```sh
npm install bluepandapl/probot-report-error
```

## Setup

This extension will load a specified configuration file in your app's code repository. (Example: `.github/report-error.yml`)

In this [YAML](http://yaml.org/) configuration file, the top-level keys correspond to the types of errors that you would like to report on. (As an example - `readConfig` for when there is an issue reading a config file)

For each type of error, you should specify a `title` and `body` for the created issue when an error occurs. The text content may contain `{{placeHolder}}` values which are replaced with values that you specify when calling `report()`.

### Example (report-error.yml):

```yaml
readConfig:
  title: 'Error while reading welcome.yml'
  body: |
    An error occurred while trying to parse `welcome.yml`.

    ```
    {{errorName}}: {{errorMessage}}
    ```

    Check the syntax of `.github/welcome.yml` and make sure it's valid. For more information or questions, see [probot/stale](https://github.com/probot/stale)

createComment:
  title: 'Error while creating welcome comment'
  body: |
    An error occurred while trying to create a welcome comment.

    ```
    {{errorMessage}}
    ```

    Please ensure that this app has write permission on issues. For more information or questions, see [bluepandapl/probot-report-error](https://github.com/bluepandapl/probot-report-error)

```

## Usage

```js
const { ReportError } = require('probot-report-error')

module.exports = (robot) => {
  const reportError = new ReportError(robot, './.github/report-error.yml')

  robot.on('issues.opened', async context => {
    let config

    try {
      config = await getConfig(context, 'welcome.yml')
    } catch (error) {
      return reportError.report(context, 'readConfig', {errorName: error.name, errorMessage: error.message})
    }

    const params = context.issue({body: config.welcome})

    // Post a welcome comment on the issue
    await context.github.issues.createComment(params)
  })
}
```

## Development

```sh
# Install dependencies
npm install

# Run tests
npm run test
```