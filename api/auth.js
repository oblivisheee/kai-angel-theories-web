import { auth } from './_oauth.js'

export const GET = (request) => auth(request)
