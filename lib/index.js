const getConfig = require('probot-config')

async function reportError (context, type, data) {
  let config

  try {
    config = await getConfig(context, 'report-error.yml')
    if (!config) context.log.info('Missing "report-error.yml" configuration file')
  } catch (error) {
    return postError(
      context,
      'Failed to parse report-error.yml',
      'An error occurred while trying to parse `report-error.yml`\n' +
      '```\n' + `${error.name}: ${error.message}\n` + '```\n' +
      'Check the syntax of `.github/report-error.yml` and make sure it\'s valid. For more information or questions, see [bluepandapl/probot-report-error](https://github.com/bluepandapl/probot-report-error)'
    )
  }

  let options

  if (type && config && config[type]) {
    options = config[type]
  } else {
    options = {
      title: 'Uncaught error in probot application',
      body: 'Something went wrong in your probot application. Please check the logs to resolve this issue.'
    }
  }

  const title = replaceInString(options.title, data)
  const body = replaceInString(options.body, data)

  return postError(context, title, body)
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

async function postError (context, title, body) {
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

module.exports = {
  reportError,
  replaceInString
}
