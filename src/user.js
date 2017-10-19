const _ = require('lodash')
const {
  createPromisedApi
} = require('./promised')

const AbstractApi = require('./abstract_api')

/**
 * API docs: https://confluence.atlassian.com/bitbucket/user-endpoint-2-0-744527199.html
 */
module.exports = function UserApi(api, opts = {}) {
  const result = AbstractApi(api, opts = {})

  const localApi = {
    name: 'User',
    /**
     * Get the info for the authenticated user
     */
    get(callback) {
      api.get(
        'user',
        null, null,
        result.$createListener(callback)
      )
    },

    /**
     * Get all the registered emails for the authenticated user
     */
    getEmails(callback) {
      const uri = 'user/emails'
      api.get(
        uri,
        null, null,
        result.$createListener(callback)
      )
    },

    /**
     * Get email details for email registered to authenticated user
     */
    getEmailDetails(emailAddr, callback) {
      const uri = `user/emails/${emailAddr}`
      api.get(
        uri,
        null, null,
        result.$createListener(callback)
      )
    }
  }

  localApi.promised = createPromisedApi(localApi, opts)
  return _.assign(result, localApi)
}