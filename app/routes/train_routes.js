// Express docs: http://expressjs.com/en/api.html
const express = require('express')
// Passport docs: http://www.passportjs.org/docs/
const passport = require('passport')

// pull in Mongoose model for trains
const Train = require('../models/train')

// this is a collection of methods that help us detect situations when we need
// to throw a custom error
const customErrors = require('../../lib/custom_errors')

// we'll use this function to send 404 when non-existant document is requested
const handle404 = customErrors.handle404
// we'll use this function to send 401 when a user tries to modify a resource
// that's owned by someone else
const requireOwnership = customErrors.requireOwnership

// this is middleware that will remove blank fields from `req.body`, e.g.
const removeBlanks = require('../../lib/remove_blank_fields')
// passing this as a second argument to `router.<verb>` will make it
// so that a token MUST be passed for that route to be available
// it will also set `req.user`
const requireToken = passport.authenticate('bearer', { session: false })

// instantiate a router (mini app that only handles routes)
const router = express.Router()

// INDEX
router.get('/trains', requireToken, (req, res, next) => {
  Train.find({ owner: req.user.id })
    .then(trains => {
      // `trains` will be an array of Mongoose documents
      // we want to convert each one to a POJO, so we use `.map` to
      // apply `.toObject` to each one
      return trains.map(train => train.toObject())
    })
    // respond with status 200 and JSON of the resource
    .then(trains => res.status(200).json({ trains: trains }))
    // if an error occurs, pass it to the handler
    .catch(next)
})

// SHOW
router.get('/trains/:id', requireToken, (req, res, next) => {
  // req.params.id will be set based on the `:id` in the route
  Train.findById(req.params.id)
    .then(handle404)
    // if `findById` is succesful, respond with 200 and "train" JSON
    .then(train => res.status(200).json({ train: train.toObject() }))
    // if an error occurs, pass it to the handler
    .catch(next)
})

// CREATE
// POST /trains
router.post('/trains', requireToken, (req, res, next) => {
  // set owner of new train to be current user
  req.body.train.owner = req.user.id

  Train.create(req.body.train)
    // respond to succesful `create` with status 201 and JSON of new train
    .then(train => {
      res.status(201).json({ train: train.toObject() })
    })
    // if an error occurs, pass it off to error handler
    // the error handler needs the error message and the `res` object so that it
    // can send an error message back to the client
    .catch(next)
})

// UPDATE
router.patch('/trains/:id', requireToken, removeBlanks, (req, res, next) => {
  // if the client attempts to change the `owner` property by including a new
  // owner, prevent that by deleting that key/value pair
  delete req.body.train.owner

  Train.findById(req.params.id)
    .then(handle404)
    .then(train => {
      // pass the `req` object and the Mongoose record to `requireOwnership`
      // it will throw an error if the current user isn't the owner
      requireOwnership(req, train)

      // pass the result of Mongoose's `.update` to the next `.then`
      return train.updateOne(req.body.train)
    })
    // if that succeeded, return 204 and no JSON
    .then(() => res.sendStatus(204))
    // if an error occurs, pass it to the handler
    .catch(next)
})

// DESTROY
router.delete('/trains/:id', requireToken, (req, res, next) => {
  Train.findById(req.params.id)
    .then(handle404)
    .then(train => {
      // throw an error if current user doesn't own the train
      requireOwnership(req, train)
      // delete the train ONLY IF the above didn't throw
      train.deleteOne()
    })
    // send back 204 and no content if the deletion succeeded
    .then(() => res.sendStatus(204))
    // if an error occurs, pass it to the handler
    .catch(next)
})

module.exports = router
