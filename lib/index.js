const yaml = require('js-yaml')
const fs = require('fs')

class ReportError {
  constructor (robot, configPath) {
    try {
      this.config = yaml.safeLoad(fs.readFileSync(configPath, 'utf8'))
    } catch (error) {
      robot.log.error(`Failed to read config file at ${configPath}: (${error.name}): ${error.message}`)
      throw error
    }
  }

  async report (context, type, data) {
    let options

    if (type && this.config[type]) {
      options = this.config[type]
    } else {
      options = {
        title: 'Uncaught error in probot application',
        body: 'Something went wrong in your probot application. Please contact the app developer to resolve this issue.'
      }
    }

    const title = replaceInString(options.title, data)
    const body = replaceInString(options.body, data)

    return this.postError(context, title, body)
  }

  async postError (context, title, body) {
    // Check for an existing open issue with the same title
    // Return early if an open issue already exists
    const findIssueParams = context.repo({state: 'open', 'per_page': 100})

    let foundIssues = await context.github.issues.getForRepo(findIssueParams)
    if (findIssueByTitle(foundIssues.data, title)) return

    while (context.github.hasNextPage(foundIssues)) {
      foundIssues = await context.github.getNextPage(foundIssues)
      if (findIssueByTitle(foundIssues.data, title)) return
    }

    const createIssueParams = context.repo({title, body})

    try {
      await context.github.issues.create(createIssueParams)
    } catch (error) {
      context.log.error(`Failed to report issue. Please ensure that this app has permission to create issues: ${error.message}`)
    }
  }
}

function replaceInString (str, data) {
  if (!data) return str

  return Object.keys(data).reduce((acc, key) => {
    return acc.replace(new RegExp(`{{${key}}}`, 'g'), data[key])
  }, str)
}

function findIssueByTitle (issues, title) {
  return issues.find(issue => issue.title === title)
}

module.exports = {
  ReportError,
  replaceInString
}
