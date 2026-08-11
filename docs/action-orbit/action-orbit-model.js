// NexusSnap Action Orbit generic workflow model.
// Host choices, stage transitions and intent patches are declared in JSON.
(function(global, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  global.NexusActionOrbitModel = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function() {
  'use strict';

  var ACTIONS = Object.freeze({
    STORAGE_SAVE_ONLY: 'storage:save-only', TARGET_FOLDER: 'target:folder', TARGET_COMP: 'target:comp',
    FOLDER_ROOT: 'folder:root', FOLDER_SELECTED: 'folder:selected', FOLDER_CUSTOM: 'folder:custom',
    LAYER_TOP: 'layer:top', LAYER_ABOVE: 'layer:above', LAYER_BOTTOM: 'layer:bottom',
    TIME_COMP_START: 'time:comp-start', TIME_PLAYHEAD: 'time:playhead', TIME_SELECTED_IN: 'time:selected-in', TIME_SELECTED_RANGE: 'time:selected-range',
    PACKAGE_REGULAR: 'package:regular', PACKAGE_PRECOMPOSE: 'package:precompose',
    PHOTOSHOP_PIXEL_LAYER: 'photoshop:pixel-layer', PHOTOSHOP_SMART_OBJECT: 'photoshop:smart-object', PHOTOSHOP_LOCAL_RESOURCE: 'photoshop:local-resource'
  });

  function clone(value) { return JSON.parse(JSON.stringify(value)); }
  function hostId(value) { return String(value || 'aftereffects'); }

  function resolveWorkflow(config, requestedHostId) {
    if (!config || config.schemaVersion !== 2 || !config.hosts) throw new Error('Action Orbit requires schemaVersion 2 workflow config');
    var id = hostId(requestedHostId);
    if (!config.hosts[id] && config.hosts.aftereffects) id = 'aftereffects';
    var source = config.hosts[id];
    if (!source || !source.initialStage || !source.stages || !source.stages[source.initialStage]) throw new Error('Action Orbit workflow is invalid for ' + id);
    var workflow = clone(source);
    workflow.id = id;
    workflow.behavior = clone(config.behavior || {});
    return workflow;
  }

  function optionsFor(workflow, stage) {
    var definition = workflow && workflow.stages && workflow.stages[stage];
    return definition && Array.isArray(definition.options) ? definition.options : [];
  }

  function optionFor(workflow, stage, actionId) {
    var options = optionsFor(workflow, stage);
    for (var i = 0; i < options.length; i += 1) if (options[i].id === actionId) return options[i];
    return null;
  }

  function setPath(target, path, value) {
    var parts = String(path || '').split('.').filter(Boolean);
    if (!parts.length) return;
    var owner = target;
    for (var i = 0; i < parts.length - 1; i += 1) {
      if (!owner[parts[i]] || typeof owner[parts[i]] !== 'object') owner[parts[i]] = {};
      owner = owner[parts[i]];
    }
    owner[parts[parts.length - 1]] = clone(value);
  }

  function applyPatch(draft, patch) {
    Object.keys(patch || {}).forEach(function(path) { setPath(draft, path, patch[path]); });
  }

  function normalizeResources(resources) {
    return (resources || []).map(function(resource, index) {
      var currentName = String(resource.finalName || resource.name || 'asset-' + (index + 1));
      var originalName = String(resource.originalName || resource.name || currentName);
      return { id: resource.id !== undefined ? resource.id : 'resource-' + index, originalName: originalName, finalName: currentName, renamed: !!resource.renamed || currentName !== originalName };
    });
  }

  function createDraft(options) {
    options = options || {};
    var defaults = options.defaults || {};
    var workflow = options.workflow;
    if (!workflow || !workflow.initialStage) throw new Error('Action Orbit draft requires a resolved workflow');
    var id = workflow.id || hostId(defaults.hostId || options.context && options.context.hostId);
    return {
      status: 'choosing', workflow: clone(workflow), stage: workflow.initialStage, history: [], blockedReason: '',
      messages: { blockedReason: options.messages && options.messages.blockedReason || '当前选项不可用' },
      resources: normalizeResources(options.resources), context: clone(options.context || {}),
      storage: { action: 'save-and-import', directoryMode: 'configured', directory: defaults.storageDirectory || '' },
      ae: { target: defaults.aeTarget === 'comp' ? 'comp' : 'folder', folderPath: defaults.folderPath || '{selectedFolder}', compId: defaults.compId !== undefined ? defaults.compId : null, compName: defaults.compName || '', precompose: defaults.precomposeImportedLayer === true },
      layer: { placement: defaults.layerPlacement || 'top', timeline: defaults.matchSelectedLayerOutPoint ? 'selectedRange' : (defaults.layerStartAnchor || 'compStart') },
      file: { svgMode: defaults.svgImportMode || 'original' },
      host: { id: id, representation: defaults.photoshopRepresentation === 'pixel-layer' ? 'pixel-layer' : 'smart-object', insertion: 'above-selected-or-top' },
      conflictPolicy: defaults.conflictPolicy || 'skip'
    };
  }

  function snapshot(draft) { var copy = clone(draft); copy.history = []; return copy; }
  function select(draft, actionId, capability) {
    if (!draft || draft.status !== 'choosing') return draft;
    capability = capability || {};
    if (capability.enabled === false) { draft.blockedReason = capability.reason || draft.messages.blockedReason; return draft; }
    var option = optionFor(draft.workflow, draft.stage, actionId);
    if (!option || option.external === true) return draft;
    draft.blockedReason = '';
    draft.history.push(snapshot(draft));
    applyPatch(draft, option.set);
    if (option.complete === true) draft.stage = 'ready';
    else if (option.nextStage && draft.workflow.stages[option.nextStage]) draft.stage = option.nextStage;
    else { draft.history.pop(); return draft; }
    return draft;
  }

  function back(draft) {
    if (!draft || !draft.history || !draft.history.length) return null;
    var previous = draft.history.pop(); previous.history = draft.history; return previous;
  }

  function renameResource(draft, resourceId, finalName) {
    if (!draft) return draft;
    var name = String(finalName || '').trim();
    if (!name) return draft;
    for (var i = 0; i < draft.resources.length; i += 1) if (String(draft.resources[i].id) === String(resourceId)) { draft.resources[i].finalName = name; draft.resources[i].renamed = name !== draft.resources[i].originalName; break; }
    return draft;
  }

  function toIntent(draft) {
    if (!draft || draft.stage !== 'ready' || !draft.resources.length) return null;
    return { resources: clone(draft.resources), storage: clone(draft.storage), ae: clone(draft.ae), layer: clone(draft.layer), file: clone(draft.file), host: clone(draft.host), conflictPolicy: draft.conflictPolicy, contextSnapshot: clone(draft.context) };
  }
  function cancel(draft) { if (draft) draft.status = 'cancelled'; return draft; }

  return Object.freeze({ ACTIONS: ACTIONS, resolveWorkflow: resolveWorkflow, optionsFor: optionsFor, optionFor: optionFor, createDraft: createDraft, select: select, back: back, renameResource: renameResource, toIntent: toIntent, cancel: cancel });
});
