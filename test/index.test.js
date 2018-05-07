const { ReportError, replaceInString } = require('../lib/index')
const path = require('path')

function mockRobot () {
  return {
    log: {
      error: jest.fn()
    }
  }
}

function mockContext () {
  return {
    repo (params) {
      return Object.assign({ owner: 'owner', repo: 'repo' }, params)
    },
    github: {
      issues: {
        getForRepo: jest.fn(),
        create: jest.fn()
      },
      hasNextPage: jest.fn(),
      getNextPage: jest.fn()
    },
    log: {
      info: jest.fn(),
      error: jest.fn()
    }
  }
}

describe('reportError', () => {
  let context, reportError, robot

  beforeEach(() => {
    context = mockContext()
    robot = mockRobot()
    reportError = new ReportError(robot, path.join(__dirname, './fixtures/valid.yml'))
  })

  test('it successfully reports an error', async () => {
    context.github.issues.getForRepo.mockImplementation(() => ({data: []}))
    context.github.hasNextPage.mockImplementation(() => false)

    await reportError.report(context, 'readConfig', {errorMessage: 'bad indentation'})

    expect(context.github.issues.create).toBeCalledWith({
      owner: 'owner',
      repo: 'repo',
      title: 'My Title',
      body: 'Error message: bad indentation'
    })
  })

  test('it uses the default title/body if missing config key', async () => {
    context.github.issues.getForRepo.mockImplementation(() => ({data: []}))
    context.github.hasNextPage.mockImplementation(() => false)

    await reportError.report(context, 'missingKey')

    expect(context.github.issues.create).toBeCalledWith({
      owner: 'owner',
      repo: 'repo',
      title: 'Uncaught error in probot application',
      body: 'Something went wrong in your probot application. Please contact the app developer to resolve this issue.'
    })
  })

  test('it skips reporting if an issue already exists', async () => {
    context.github.issues.getForRepo.mockImplementation(() => ({
      data: [{
        title: 'My Title'
      }]
    }))
    context.github.hasNextPage.mockImplementation(() => false)

    await reportError.report(context, 'readConfig', {errorMessage: 'bad indentation'})

    expect(context.github.issues.create).not.toHaveBeenCalled()
  })

  test('it loops over all pages of found issues', async () => {
    context.github.issues.getForRepo.mockImplementation(() => ({
      data: [
        {title: 'Some other issue'},
        {title: 'A bug report'}
      ]
    }))
    context.github.hasNextPage
        .mockImplementationOnce(() => true)
        .mockImplementationOnce(() => false)
    context.github.getNextPage.mockImplementation(() => ({
      data: [
        {title: 'A question'},
        {title: 'My Title'}
      ]
    }))

    await reportError.report(context, 'readConfig', {errorMessage: 'bad indentation'})

    expect(context.github.issues.create).not.toHaveBeenCalled()
  })

  test('it logs an error when failing to report error', async () => {
    context.github.issues.getForRepo.mockImplementation(() => ({data: []}))
    context.github.issues.create.mockImplementation(() => {
      throw new Error('failed to report')
    })
    context.github.hasNextPage.mockImplementation(() => false)

    await reportError.report(context, 'readConfig', {errorMessage: 'bad indentation'})

    expect(context.github.issues.create).toBeCalledWith({
      owner: 'owner',
      repo: 'repo',
      title: 'My Title',
      body: 'Error message: bad indentation'
    })
    expect(context.log.error).toBeCalledWith(`Failed to report issue. Please ensure that this app has permission to create issues: failed to report`)
  })

  test('it logs an error when given an invalid yml config file', () => {
    expect(() => {
      reportError = new ReportError(robot, path.join(__dirname, './fixtures/invalid.yml'))
    }).toThrow()

    expect(robot.log.error).toBeCalledWith(expect.stringContaining(`Failed to read config file at`))
  })
})

describe('replaceInString', () => {
  test('it replaces placeholders', () => {
    const data = {
      errorName: 'YAMLException',
      errorMessage: 'bad indentation'
    }

    const str = 'Name: {{errorName}}, Message: {{errorMessage}}';

    expect(replaceInString(str, data)).toBe('Name: YAMLException, Message: bad indentation')
  })

  test('it returns the original string with empty data', () => {
    const str = 'My String'
    expect(replaceInString(str, null)).toBe('My String')
  })
})
