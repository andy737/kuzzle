module.exports = function CleanAndPrepare (kuzzle, request) {
  return kuzzle.remoteActionsController.actions.cleanDb(kuzzle)
    .then(() => kuzzle.remoteActionsController.actions.prepareDb(kuzzle, request));
};
