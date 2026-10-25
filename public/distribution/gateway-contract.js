/* ALLEGRO-VIBEZ Distribution Gateway Contract v1
 * Server-boundary contract only. No provider secrets belong here.
 */
(function () {
  'use strict';

  var STATES = ['queued','running','completed','failed','cancelled'];
  var DELIVERY_STATES = ['prepared','submitted','acknowledged','delivered','rejected','failed'];

  function clean(value) {
    return String(value == null ? '' : value).trim();
  }

  function validateRequest(request) {
    var errors = [];
    request = request || {};
    if (!clean(request.release_id)) errors.push('release_id is required.');
    if (!clean(request.idempotency_key)) errors.push('idempotency_key is required.');
    if (!clean(request.job_type)) errors.push('job_type is required.');
    if (['manifest','package','submit','verify'].indexOf(request.job_type) === -1) {
      errors.push('Unsupported job_type.');
    }
    return { valid: errors.length === 0, errors: errors };
  }

  function canAdvanceJob(from, to) {
    var allowed = {
      queued: ['running','cancelled'],
      running: ['completed','failed','cancelled'],
      completed: [], failed: [], cancelled: []
    };
    return Boolean(allowed[from] && allowed[from].indexOf(to) !== -1);
  }

  function canAdvanceDelivery(from, to) {
    var allowed = {
      prepared: ['submitted','failed','rejected'],
      submitted: ['acknowledged','failed','rejected'],
      acknowledged: ['delivered','failed'],
      delivered: [], rejected: [], failed: []
    };
    return Boolean(allowed[from] && allowed[from].indexOf(to) !== -1);
  }

  function noExternalClaim(state) {
    return ['prepared','submitted','acknowledged','delivered'].indexOf(state) !== -1;
  }

  window.ALLEGRODistributionGateway = {
    JOB_STATES: STATES,
    DELIVERY_STATES: DELIVERY_STATES,
    validateRequest: validateRequest,
    canAdvanceJob: canAdvanceJob,
    canAdvanceDelivery: canAdvanceDelivery,
    isExternalClaimableState: noExternalClaim
  };
})();
