// NexusSnap Action Orbit DOM view.
// Host adapters provide a draft and receive a temporary intent on completion.
(function(global, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  global.NexusActionOrbitView = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function() {
  'use strict';

  function create(options) {
    options = options || {};
    function t(key, fallback, params) {
      var value = typeof options.translate === 'function' ? options.translate(key, fallback, params || {}) : fallback;
      if (value === undefined || value === null || value === key) value = fallback;
      return String(value).replace(/\{(\w+)\}/g, function(match, name) {
        return params && params[name] !== undefined ? params[name] : match;
      });
    }
    function localizeAction(action) {
      if (typeof options.localizeAction !== 'function') return action;
      var localized = options.localizeAction(action);
      return localized && typeof localized === 'object' ? localized : action;
    }
    var root = options.root;
    var Model = options.model;
    var Icons = options.icons;
    var workflow = options.workflow || null;
    var config = Object.assign({}, workflow && workflow.behavior || {}, options.config || {});
    var attractionDistance = config.attractionDistancePx || 96;
    var magneticDistance = config.magneticDistancePx || 56;
    var releaseDistance = config.magneticReleaseDistancePx || 82;
    var centerInViewport = options.centered === true;
    var draft = null;
    var lastFocused = null;
    var gestureActive = false;
    var gesturePointerId = null;
    var gestureArmed = true;
    var gestureAnchor = null;
    var gestureKeepOpen = false;
    var suppressCenterClick = false;
    var magneticTarget = null;
    var lastOpenAt = 0;
    var ignoreContextMenuOnce = false;
    var branchLevels = [];
    var currentShellSize = 560;
    var layoutLevelCount = 1;
    var actionMap = {};

    function indexWorkflow(nextWorkflow) {
      workflow = nextWorkflow || workflow;
      actionMap = {};
      if (!workflow || !workflow.stages) return;
      Object.keys(workflow.stages).forEach(function(stage) {
        var stageOptions = workflow.stages[stage].options || [];
        for (var i = 0; i < stageOptions.length; i += 1) {
          var localized = localizeAction(stageOptions[i]);
          stageOptions[i] = localized;
          actionMap[localized.id] = localized;
        }
      });
    }
    indexWorkflow(workflow);

    if (!root || !Model || !Icons) throw new Error('Action Orbit requires root, model, and icons');

    root.classList.add('nexus-orbit-overlay');
    root.hidden = true;
    root.innerHTML =
      '<div class="nexus-orbit-shell" role="dialog" aria-modal="true" aria-label="' + t('orbit.dialogLabel', '快速导入配置') + '">' +
        '<div class="nexus-orbit-breadcrumb" data-orbit-breadcrumb aria-live="polite"></div>' +
        '<div class="nexus-orbit-path" data-orbit-path aria-hidden="true"></div>' +
        '<div class="nexus-orbit-stage" data-orbit-stage>' +
          '<div class="nexus-orbit-level-rings" data-orbit-level-rings aria-hidden="true"></div>' +
          '<div class="nexus-orbit-vector" data-orbit-vector aria-hidden="true"><span></span></div>' +
          '<div class="nexus-orbit-nodes" data-orbit-nodes></div>' +
          '<div class="nexus-orbit-hover-label" data-orbit-hover-label aria-hidden="true"></div>' +
          '<button type="button" class="nexus-orbit-center" data-orbit-back aria-label="' + t('orbit.back', '返回上一级') + '">' +
            '<span class="nexus-orbit-center-icon" data-orbit-center-icon></span>' +
            '<span class="nexus-orbit-center-label" data-orbit-center-label></span>' +
          '</button>' +
          '<button type="button" class="nexus-orbit-commit" data-orbit-commit title="' + t('orbit.commit', '确认当前合成配置') + '" aria-label="' + t('orbit.commit', '确认当前合成配置') + '" hidden></button>' +
        '</div>' +
        '<div class="nexus-orbit-description" data-orbit-description aria-live="polite"></div>' +
      '</div>';

    var nodesRoot = root.querySelector('[data-orbit-nodes]');
    var hoverLabel = root.querySelector('[data-orbit-hover-label]');
    var levelRings = root.querySelector('[data-orbit-level-rings]');
    var vector = root.querySelector('[data-orbit-vector]');
    var center = root.querySelector('[data-orbit-back]');
    var commit = root.querySelector('[data-orbit-commit]');
    var description = root.querySelector('[data-orbit-description]');
    var breadcrumb = root.querySelector('[data-orbit-breadcrumb]');
    var path = root.querySelector('[data-orbit-path]');
    var centerIcon = root.querySelector('[data-orbit-center-icon]');
    var centerLabel = root.querySelector('[data-orbit-center-label]');
    centerIcon.innerHTML = Icons.back || '';
    commit.innerHTML = Icons.confirm || '';

    function stageActions(stage) {
      return Model.optionsFor(workflow, stage);
    }

    function stageLabel(stage) {
      if (stage === 'ready') return t('orbit.stage.ready', '确认');
      var definition = workflow && workflow.stages && workflow.stages[stage];
      return definition ? t(definition.labelKey || ('orbit.stage.' + stage), definition.label || stage) : stage;
    }

    function maximumStageDepth(stage, visited) {
      if (!stage || stage === 'ready') return 0;
      visited = visited || {};
      if (visited[stage]) return 1;
      var nextVisited = Object.assign({}, visited);
      nextVisited[stage] = true;
      var available = stageActions(stage);
      var depth = 1;
      for (var i = 0; i < available.length; i += 1) {
        if (!available[i].nextStage) continue;
        depth = Math.max(depth, 1 + maximumStageDepth(available[i].nextStage, nextVisited));
      }
      return depth;
    }

    function describe(action) {
      if (!action) {
        var count = draft && draft.resources ? draft.resources.length : 0;
        description.textContent = count > 1
          ? t('orbit.resourcesHint', '{count} 个资源 · 松开有效节点后逐项确认名称', { count: count })
          : (draft && draft.resources[0] ? draft.resources[0].finalName : t('orbit.chooseImport', '选择导入配置'));
        return;
      }
      description.textContent = action.label + ' · ' + action.description;
    }

    function capabilityFor(actionId) {
      var action = actionMap[actionId];
      var flags = draft && draft.context && draft.context.capabilities || {};
      if (action && action.requires && flags[action.requires] !== true) {
        return { enabled: false, reason: action.unavailableReason || t('orbit.unavailable', '当前不可用') };
      }
      if (typeof options.getCapability !== 'function') return { enabled: true };
      return options.getCapability(actionId, draft, action) || { enabled: true };
    }

    function cloneDraft(value) {
      return JSON.parse(JSON.stringify(value));
    }

    function levelRingBounds(levelIndex, levelCount) {
      var compact = currentShellSize < 420;
      var innerEdge = compact
        ? (levelCount >= 4 ? 11.5 : levelCount >= 3 ? 13 : 16)
        : (levelCount >= 4 ? 12.5 : levelCount >= 3 ? 14 : 15);
      var outerEdge = compact ? 48 : 49;
      var band = (outerEdge - innerEdge) / Math.max(1, levelCount);
      return {
        inner: innerEdge + levelIndex * band + 0.55,
        outer: innerEdge + (levelIndex + 1) * band - 0.55
      };
    }

    function polarPoint(radius, angle) {
      var radians = angle * Math.PI / 180;
      return [
        50 + Math.cos(radians) * radius,
        50 + Math.sin(radians) * radius
      ];
    }

    function sectorPolygon(innerRadius, outerRadius, startAngle, endAngle) {
      var span = Math.max(1, endAngle - startAngle);
      var steps = Math.max(18, Math.ceil(span / 2.5));
      var points = [];
      var i;
      for (i = 0; i <= steps; i += 1) {
        points.push(polarPoint(outerRadius, startAngle + span * i / steps));
      }
      for (i = steps; i >= 0; i -= 1) {
        points.push(polarPoint(innerRadius, startAngle + span * i / steps));
      }
      var result = [];
      for (i = 0; i < points.length; i += 1) {
        result.push(points[i][0].toFixed(3) + '% ' + points[i][1].toFixed(3) + '%');
      }
      return 'polygon(' + result.join(', ') + ')';
    }

    function positionNodes(buttons, levelIndex, levelCount) {
      var count = buttons.length;
      if (!count) return;
      var bounds = levelRingBounds(levelIndex, levelCount);
      var sectorAngle = 360 / count;
      var gapAngle = Math.min(1.8, Math.max(0.8, sectorAngle * 0.018));
      var iconRadius = bounds.inner + (bounds.outer - bounds.inner) * 0.55;
      for (var i = 0; i < count; i += 1) {
        var angle = -90 + i * sectorAngle;
        var startAngle = angle - sectorAngle / 2 + gapAngle;
        var endAngle = angle + sectorAngle / 2 - gapAngle;
        var radians = angle * Math.PI / 180;
        var x = Math.cos(radians);
        var y = Math.sin(radians);
        buttons[i].style.setProperty('--orbit-sector-clip', sectorPolygon(bounds.inner, bounds.outer, startAngle, endAngle));
        buttons[i].style.setProperty('--orbit-icon-x', (x * iconRadius).toFixed(3) + '%');
        buttons[i].style.setProperty('--orbit-icon-y', (y * iconRadius).toFixed(3) + '%');
        buttons[i].style.setProperty('--orbit-node-layer', String(10 + levelIndex));
        buttons[i].style.setProperty('--orbit-index', i);
        buttons[i].dataset.sectorAngle = sectorAngle.toFixed(3);
        buttons[i].dataset.labelSide = Math.abs(x) > 0.48
          ? (x < 0 ? 'left' : 'right')
          : (y < 0 ? 'top' : 'bottom');
      }
    }

    function renderLevelRings(visibleLevels) {
      levelRings.innerHTML = '';
      for (var i = layoutLevelCount - 1; i >= 0; i -= 1) {
        var ring = document.createElement('div');
        var bounds = levelRingBounds(i, layoutLevelCount);
        var size = bounds.outer * 2;
        ring.className = 'nexus-orbit-ring nexus-orbit-level-ring';
        ring.dataset.level = i;
        ring.dataset.stage = visibleLevels[i] ? visibleLevels[i].stage : '';
        ring.classList.toggle('is-empty', !visibleLevels[i]);
        ring.style.setProperty('--orbit-ring-size', size + '%');
        ring.style.setProperty('--orbit-ring-layer', layoutLevelCount - i);
        levelRings.appendChild(ring);
      }
    }

    function positionShell(anchor) {
      var viewportWidth = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0);
      var viewportHeight = Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0);
      var size = Math.min(460, Math.max(280, Math.min(viewportWidth, viewportHeight) * 0.92));
      currentShellSize = size;
      var half = size / 2;
      var margin = 8;
      var minX = half + margin;
      var maxX = viewportWidth - half - margin;
      var minY = half + margin;
      var maxY = viewportHeight - half - margin;
      var desiredX = !centerInViewport && anchor && isFinite(anchor.clientX) ? anchor.clientX : viewportWidth / 2;
      var desiredY = !centerInViewport && anchor && isFinite(anchor.clientY) ? anchor.clientY : viewportHeight / 2;
      var centerX = maxX < minX ? viewportWidth / 2 : Math.max(minX, Math.min(maxX, desiredX));
      var centerY = maxY < minY ? viewportHeight / 2 : Math.max(minY, Math.min(maxY, desiredY));
      var shell = root.querySelector('.nexus-orbit-shell');
      shell.style.setProperty('--orbit-shell-size', size + 'px');
      shell.style.setProperty('--orbit-shell-x', centerX + 'px');
      shell.style.setProperty('--orbit-shell-y', centerY + 'px');
      root.classList.toggle('is-anchor-shifted', Math.abs(centerX - desiredX) > 8 || Math.abs(centerY - desiredY) > 8);
    }

    function nodeCenter(node) {
      var icon = node.querySelector('.nexus-local-icon');
      var rect = (icon || node).getBoundingClientRect();
      return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    }

    function hideHoverLabel() {
      hoverLabel.classList.remove('is-visible');
      hoverLabel.setAttribute('aria-hidden', 'true');
    }

    function showHoverLabel(node, text) {
      if (!node || !text || root.hidden) {
        hideHoverLabel();
        return;
      }
      window.requestAnimationFrame(function() {
        if (!node.isConnected || root.hidden) return;
        var icon = node.querySelector('.nexus-local-icon');
        var anchorRect = (icon || node).getBoundingClientRect();
        var stageRect = nodesRoot.getBoundingClientRect();
        hoverLabel.textContent = text;
        hoverLabel.dataset.labelSide = node.dataset.labelSide || 'right';
        hoverLabel.style.setProperty('--orbit-label-x', (anchorRect.left + anchorRect.width / 2 - stageRect.left) + 'px');
        hoverLabel.style.setProperty('--orbit-label-y', (anchorRect.top + anchorRect.height / 2 - stageRect.top) + 'px');
        hoverLabel.setAttribute('aria-hidden', 'false');
        hoverLabel.classList.add('is-visible');
      });
    }

    function distanceBetween(a, b) {
      var x = a.x - b.x;
      var y = a.y - b.y;
      return Math.sqrt(x * x + y * y);
    }

    function resetNodeProximity() {
      var buttons = nodesRoot.querySelectorAll('.nexus-orbit-node');
      for (var i = 0; i < buttons.length; i += 1) {
        buttons[i].style.setProperty('--orbit-scale', '1');
        buttons[i].classList.remove('is-near', 'is-magnetic');
      }
    }

    function nearestGestureNode(point) {
      var buttons = nodesRoot.querySelectorAll('.nexus-orbit-node:not(:disabled):not(.is-branch-selected)');
      var nearest = null;
      var nearestDistance = Infinity;
      for (var i = 0; i < buttons.length; i += 1) {
        var centerPoint = nodeCenter(buttons[i]);
        var distance = distanceBetween(point, centerPoint);
        if (distance < nearestDistance) {
          nearest = buttons[i];
          nearestDistance = distance;
        }
      }
      return { node: nearest, distance: nearestDistance };
    }

    function updateVector(point, snappedNode) {
      if (!gestureActive) return;
      var centerRect = center.getBoundingClientRect();
      var origin = { x: centerRect.left + centerRect.width / 2, y: centerRect.top + centerRect.height / 2 };
      var endpoint = snappedNode ? nodeCenter(snappedNode) : point;
      var dx = endpoint.x - origin.x;
      var dy = endpoint.y - origin.y;
      var length = Math.max(0, Math.sqrt(dx * dx + dy * dy) - (snappedNode ? 20 : 8));
      vector.style.setProperty('--orbit-vector-length', Math.min(length, 220) + 'px');
      vector.style.setProperty('--orbit-vector-angle', Math.atan2(dy, dx) + 'rad');
      vector.classList.toggle('is-snapped', !!snappedNode);
    }

    function updateSelectionVector() {
      vector.classList.remove('is-selection-path');
      if (gestureActive) return;
      var selectedNodes = nodesRoot.querySelectorAll('.nexus-orbit-node.is-branch-selected');
      var selectedNode = selectedNodes[selectedNodes.length - 1];
      if (!selectedNode) {
        vector.style.setProperty('--orbit-vector-length', '0px');
        return;
      }
      var centerRect = center.getBoundingClientRect();
      var origin = { x: centerRect.left + centerRect.width / 2, y: centerRect.top + centerRect.height / 2 };
      var endpoint = nodeCenter(selectedNode);
      var dx = endpoint.x - origin.x;
      var dy = endpoint.y - origin.y;
      vector.style.setProperty('--orbit-vector-length', Math.max(0, Math.sqrt(dx * dx + dy * dy) - 14) + 'px');
      vector.style.setProperty('--orbit-vector-angle', Math.atan2(dy, dx) + 'rad');
      vector.classList.add('is-selection-path');
    }

    function updateGestureFeedback(point) {
      var nearest = nearestGestureNode(point);
      var candidate = nearest.node;

      resetNodeProximity();
      if (candidate && nearest.distance <= attractionDistance) {
        var proximity = 1 - Math.min(1, nearest.distance / attractionDistance);
        candidate.style.setProperty('--orbit-scale', (1 + proximity * 0.18).toFixed(3));
        candidate.classList.add('is-near');
      }

      if (magneticTarget) {
        var retainedDistance = distanceBetween(point, nodeCenter(magneticTarget));
        if (retainedDistance > releaseDistance) magneticTarget = null;
      }
      if (!magneticTarget && candidate && nearest.distance <= magneticDistance) magneticTarget = candidate;
      if (magneticTarget) {
        magneticTarget.style.setProperty('--orbit-scale', '1.28');
        magneticTarget.classList.add('is-magnetic');
      }
      if (magneticTarget || (candidate && nearest.distance <= attractionDistance)) {
        var feedbackNode = magneticTarget || candidate;
        var feedbackAction = actionMap[feedbackNode.dataset.actionId];
        showHoverLabel(feedbackNode, feedbackAction && feedbackAction.label);
      } else {
        hideHoverLabel();
      }
      updateVector(point, magneticTarget);
      return magneticTarget;
    }

    function finishIfReady() {
      var intent = Model.toIntent(draft);
      if (!intent) return false;
      close(false);
      if (typeof options.onReady === 'function') options.onReady(intent, draft);
      return true;
    }

    function choose(action, capability, deferFinish, levelIndex) {
      if (typeof options.onBeforeChoose === 'function' && options.onBeforeChoose(action, draft) === true) return;
      if (typeof levelIndex === 'number' && levelIndex < branchLevels.length) {
        draft = cloneDraft(branchLevels[levelIndex].baseDraft);
        branchLevels = branchLevels.slice(0, levelIndex);
      }
      var baseDraft = cloneDraft(draft);
      var sourceStage = draft.stage;
      draft = Model.select(draft, action.id, capability);
      if (draft.stage !== sourceStage || draft.stage === 'ready') {
        branchLevels.push({
          baseDraft: baseDraft,
          stage: sourceStage,
          selectedActionId: action.id
        });
      }
      if (!deferFinish && finishIfReady()) return;
      if (draft.stage === 'ready') {
        root.setAttribute('data-orbit-stage', 'ready');
        description.textContent = t('orbit.releaseToConfirm', '松开确认当前选择');
        commit.hidden = false;
        return;
      }
      render();
      // The pointer must leave the selected magnetic sector before the next
      // level is armed, preventing one small movement from cascading.
    }

    function render() {
      if (!draft) return;
      nodesRoot.innerHTML = '';
      hideHoverLabel();
      var hostLabel = draft.host && draft.host.id === 'photoshop' ? 'PS' : 'AE';
      breadcrumb.textContent = hostLabel + ' · ' + stageLabel(draft.stage);
      var pathParts = [hostLabel];
      for (var b = 0; b < branchLevels.length; b += 1) pathParts.push(stageLabel(branchLevels[b].stage));
      if (draft.stage !== 'ready') pathParts.push(stageLabel(draft.stage));
      path.textContent = pathParts.join('  ·  ');
      root.setAttribute('data-orbit-host', draft.host && draft.host.id || 'aftereffects');
      root.setAttribute('data-orbit-stage', draft.stage);
      center.setAttribute('aria-label', draft.history.length ? t('orbit.back', '返回上一级') : t('orbit.cancelQuickImport', '取消快速导入'));
      center.title = draft.history.length ? t('orbit.back', '返回上一级') : t('orbit.cancel', '取消');
      centerLabel.textContent = draft.history.length ? t('orbit.back', '返回上一级') : t('orbit.cancel', '取消');
      centerIcon.innerHTML = draft.history.length ? (Icons.back || '') : (Icons.cancel || '');
      centerIcon.hidden = false;
      commit.hidden = draft.stage !== 'ready';
      describe(null);

      var visibleLevels = branchLevels.slice();
      if (draft.stage !== 'ready') {
        visibleLevels.push({
          baseDraft: cloneDraft(draft),
          stage: draft.stage,
          selectedActionId: ''
        });
      }
      root.setAttribute('data-orbit-level-count', String(layoutLevelCount));
      root.setAttribute('data-orbit-visible-level-count', String(visibleLevels.length));
      renderLevelRings(visibleLevels);
      var focusButtons = [];
      for (var levelIndex = 0; levelIndex < visibleLevels.length; levelIndex += 1) {
        var level = visibleLevels[levelIndex];
        var available = stageActions(level.stage);
        var levelButtons = [];
        for (var i = 0; i < available.length; i += 1) {
          (function(action, renderedLevelIndex, renderedLevel) {
          var capability = capabilityFor(action.id);
          var button = document.createElement('button');
          button.type = 'button';
          button.className = 'nexus-orbit-node';
          button.dataset.actionId = action.id;
          button.dataset.group = action.group || '';
          button.dataset.level = renderedLevelIndex;
          button.dataset.nextStage = action.nextStage || '';
          var branchSelected = renderedLevel.selectedActionId === action.id;
          var branchAncestor = renderedLevelIndex < visibleLevels.length - 1;
          var pathLocked = false;
          button.classList.toggle('is-branch-selected', branchSelected);
          button.classList.toggle('is-branch-ancestor', branchAncestor);
          button.classList.toggle('is-path-locked', pathLocked);
          button.disabled = capability.enabled === false;
          button.title = capability.enabled === false
            ? action.label + '：' + (capability.reason || t('orbit.unavailable', '当前不可用'))
            : action.description;
          button.setAttribute('aria-label', button.title);
          button.innerHTML = (Icons[action.icon] || '') + '<span>' + escapeHtml(action.label) + '</span>';
          button.addEventListener('mouseenter', function() {
            describe(capability.enabled === false
              ? { label: action.label, description: capability.reason || t('orbit.unavailable', '当前不可用') }
              : action);
            showHoverLabel(button, action.label);
          });
          button.addEventListener('focus', function() {
            describe(capability.enabled === false
              ? { label: action.label, description: capability.reason || t('orbit.unavailable', '当前不可用') }
              : action);
            showHoverLabel(button, action.label);
          });
          button.addEventListener('mouseleave', function() {
            describe(null);
            hideHoverLabel();
          });
          button.addEventListener('blur', function() {
            hideHoverLabel();
          });
          button.addEventListener('click', function() {
            if (gestureActive) return;
            choose(action, capability, false, renderedLevelIndex);
          });
          nodesRoot.appendChild(button);
          levelButtons.push(button);
          focusButtons.push(button);
          })(available[i], levelIndex, level);
        }
        positionNodes(levelButtons, levelIndex, layoutLevelCount);
      }
      magneticTarget = null;
      window.requestAnimationFrame(function() {
        if (gestureActive) return;
        center.focus();
        updateSelectionVector();
      });
    }

    function goBack() {
      if (!draft) return;
      var previous = Model.back(draft);
      if (!previous) {
        close(true);
        return;
      }
      draft = previous;
      branchLevels.pop();
      render();
    }

    function close(cancelled) {
      if (cancelled && draft) Model.cancel(draft);
      gestureActive = false;
      gesturePointerId = null;
      gestureArmed = true;
      gestureAnchor = null;
      gestureKeepOpen = false;
      magneticTarget = null;
      hideHoverLabel();
      root.hidden = true;
      root.classList.remove('is-open', 'is-gesture-active', 'is-anchor-shifted');
      if (lastFocused && typeof lastFocused.focus === 'function') lastFocused.focus();
      if (cancelled && typeof options.onCancel === 'function') options.onCancel(draft);
    }

    function open(nextDraft, anchor, options) {
      draft = nextDraft;
      indexWorkflow(nextDraft.workflow || workflow);
      branchLevels = [];
      layoutLevelCount = Math.max(1, maximumStageDepth(nextDraft.stage));
      ignoreContextMenuOnce = !!(options && options.suppressEntryContextMenu);
      lastOpenAt = Date.now();
      gestureAnchor = anchor || null;
      lastFocused = document.activeElement;
      root.hidden = false;
      root.classList.add('is-open');
      positionShell(gestureAnchor);
      render();
    }

    function beginGesture(nextDraft, pointerId, anchor) {
      gestureAnchor = anchor || null;
      open(nextDraft);
      gestureActive = true;
      gesturePointerId = pointerId;
      gestureArmed = true;
      gestureKeepOpen = true;
      root.classList.add('is-gesture-active');
      description.textContent = t('orbit.holdAndDrag', '保持按住并拖向一个节点');
    }

    function armGesture(pointerId) {
      if (!draft || root.hidden) return;
      gestureActive = true;
      gesturePointerId = pointerId;
      gestureArmed = true;
      gestureKeepOpen = true;
      magneticTarget = null;
      root.classList.add('is-gesture-active');
      description.textContent = t('orbit.dragFromCenter', '按住左键并拖向一个节点');
    }

    function handleGestureMove(event) {
      if (!gestureActive || event.pointerId !== gesturePointerId) return;
      var point = { x: event.clientX, y: event.clientY };
      var centerRect = center.getBoundingClientRect();
      var centerPoint = { x: centerRect.left + centerRect.width / 2, y: centerRect.top + centerRect.height / 2 };
      var centerDistance = distanceBetween(point, centerPoint);
      var target = updateGestureFeedback(point);
      if (!target && centerDistance > 58) {
        gestureArmed = true;
        return;
      }
      if (!gestureArmed) return;

      if (centerDistance <= 46) {
        if (draft && draft.history.length) {
          gestureArmed = false;
          suppressCenterClick = true;
          goBack();
        }
        return;
      }
      if (!target) return;

      var action = actionMap[target.dataset.actionId];
      if (!action) return;
      var capability = capabilityFor(action.id);
      describe(capability.enabled === false
        ? { label: action.label, description: capability.reason || t('orbit.unavailable', '当前不可用') }
        : action);
      if (capability.enabled === false) return;
      gestureArmed = false;
      suppressCenterClick = true;
      choose(action, capability, true, Number(target.dataset.level));
    }

    function handleGestureEnd(event) {
      if (!gestureActive || event.pointerId !== gesturePointerId) return;
      if (finishIfReady()) return;
      if (!gestureKeepOpen) {
        close(true);
        return;
      }
      gestureActive = false;
      gesturePointerId = null;
      gestureArmed = true;
      magneticTarget = null;
      resetNodeProximity();
      vector.style.setProperty('--orbit-vector-length', '0px');
      vector.classList.remove('is-snapped');
      root.classList.remove('is-gesture-active');
      describe(null);
      ignoreContextMenuOnce = event.button === 2;
    }

    center.addEventListener('pointerdown', function(event) {
      if (event.button !== 0 && event.pointerType !== 'touch') return;
      event.preventDefault();
      suppressCenterClick = false;
      armGesture(event.pointerId);
    });
    center.addEventListener('click', function(event) {
      if (root.hidden) {
        suppressCenterClick = false;
        event.preventDefault();
        return;
      }
      if (suppressCenterClick) {
        suppressCenterClick = false;
        event.preventDefault();
        return;
      }
      goBack();
    });
    nodesRoot.addEventListener('mouseover', function(event) {
      var button = event.target.closest('.nexus-orbit-node');
      if (!button || !nodesRoot.contains(button) || button.disabled) return;
      if (event.relatedTarget && button.contains(event.relatedTarget)) return;
      var action = actionMap[button.dataset.actionId];
      if (!action) return;
      describe(action);
    });
    nodesRoot.addEventListener('pointermove', function(event) {
      if (!gestureActive) return;
      var button = event.target.closest('.nexus-orbit-node');
      if (!button || !nodesRoot.contains(button) || button.disabled) return;
      var action = actionMap[button.dataset.actionId];
      if (!action) return;
      describe(action);
    });
    commit.addEventListener('click', function() {
      finishIfReady();
    });
    root.addEventListener('keydown', function(event) {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      goBack();
    });
    root.addEventListener('pointerdown', function(event) {
      if (event.target === root) close(true);
    });
    root.addEventListener('contextmenu', function(event) {
      if (root.hidden) return;
      event.preventDefault();
      if (ignoreContextMenuOnce) { ignoreContextMenuOnce = false; return; }
      if (Date.now() - lastOpenAt < 350) return;
      close(true);
    });
    document.addEventListener('pointermove', handleGestureMove);
    document.addEventListener('pointerup', handleGestureEnd);
    document.addEventListener('pointercancel', handleGestureEnd);
    function handleViewportResize() {
      if (!root.hidden) positionShell(gestureAnchor);
    }
    window.addEventListener('resize', handleViewportResize);

    return Object.freeze({
      open: open,
      beginGesture: beginGesture,
      armGesture: armGesture,
      close: function() { close(true); },
      back: goBack,
      getDraft: function() { return draft; },
      render: render,
      destroy: function() {
        close(true);
        document.removeEventListener('pointermove', handleGestureMove);
        document.removeEventListener('pointerup', handleGestureEnd);
        document.removeEventListener('pointercancel', handleGestureEnd);
        window.removeEventListener('resize', handleViewportResize);
        root.innerHTML = '';
      }
    });
  }

  function escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  return Object.freeze({ create: create });
});
