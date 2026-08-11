window.NEXUS_ORBIT_CONFIG = {
  "schemaVersion": 2,
  "behavior": {
    "holdDelayMs": 380,
    "movementTolerancePx": 6,
    "magneticDistancePx": 56,
    "magneticReleaseDistancePx": 82,
    "attractionDistancePx": 96
  },
  "hosts": {
    "aftereffects": {
      "initialStage": "destination",
      "stages": {
        "destination": {
          "label": "导入方式",
          "labelKey": "orbit.stage.destination",
          "options": [
            { "id": "target:folder", "icon": "folder", "label": "文件夹", "description": "导入到 AE 项目文件夹", "set": { "storage.action": "save-and-import", "storage.directoryMode": "configured", "ae.target": "folder" }, "nextStage": "folder", "requires": "project", "unavailableReason": "没有打开的 AE 项目" },
            { "id": "target:comp", "icon": "composition", "label": "合成", "description": "导入素材并添加到目标合成", "set": { "storage.action": "save-and-import", "storage.directoryMode": "configured", "ae.target": "comp" }, "nextStage": "comp-placement", "requires": "activeComp", "unavailableReason": "没有活动合成" },
            { "id": "storage:save-only", "icon": "download-local", "label": "下载本地", "description": "直接保存到本地，不导入 AE", "set": { "storage.action": "save-only", "storage.directoryMode": "host-default", "storage.directory": "", "ae.target": "none" }, "complete": true }
          ]
        },
        "folder": {
          "label": "文件夹位置",
          "labelKey": "orbit.stage.folder",
          "options": [
            { "id": "folder:root", "icon": "home", "label": "项目根目录", "description": "导入到 AE 项目根目录", "set": { "ae.folderPath": "{rootFolder}" }, "complete": true },
            { "id": "folder:selected", "icon": "folder-selected", "label": "当前选中文件夹", "description": "使用 AE 当前选中的项目文件夹", "set": { "ae.folderPath": "{selectedFolder}" }, "complete": true },
            { "id": "folder:custom", "icon": "edit", "label": "自定义文件夹", "description": "在最终确认面板输入 AE 文件夹路径", "set": { "ae.folderPath": "" }, "complete": true }
          ]
        },
        "comp-placement": {
          "label": "图层顺序",
          "labelKey": "orbit.stage.compPlacement",
          "options": [
            { "id": "layer:top", "icon": "layer-top", "label": "最上层", "description": "把素材图层放到合成最上方", "set": { "layer.placement": "top" }, "nextStage": "comp-timeline" },
            { "id": "layer:above", "icon": "layer-above", "label": "选中层之上", "description": "把素材图层放到当前选中图层上方", "set": { "layer.placement": "above" }, "nextStage": "comp-timeline", "requires": "selectedLayer", "unavailableReason": "当前合成没有选中图层" },
            { "id": "layer:bottom", "icon": "layer-bottom", "label": "最下层", "description": "把素材图层放到合成最下方", "set": { "layer.placement": "bottom" }, "nextStage": "comp-timeline" }
          ]
        },
        "comp-timeline": {
          "label": "时间位置",
          "labelKey": "orbit.stage.compTimeline",
          "options": [
            { "id": "time:comp-start", "icon": "time-start", "label": "合成起点", "description": "把图层时间放到合成起点", "set": { "layer.timeline": "compStart" }, "complete": true },
            { "id": "time:playhead", "icon": "time-playhead", "label": "当前播放头", "description": "把图层时间放到当前播放头", "set": { "layer.timeline": "playhead" }, "complete": true },
            { "id": "time:selected-in", "icon": "time-selected-in", "label": "选中层入点", "description": "把图层起点对齐选中图层入点", "set": { "layer.timeline": "selectedIn" }, "complete": true, "requires": "selectedLayer", "unavailableReason": "当前合成没有选中图层" },
            { "id": "time:selected-range", "icon": "time-selected-range", "label": "匹配选中层范围", "description": "同时匹配选中图层的入点和出点", "set": { "layer.timeline": "selectedRange" }, "complete": true, "requires": "selectedLayer", "unavailableReason": "当前合成没有选中图层" }
          ]
        }
      }
    },
    "photoshop": {
      "initialStage": "representation",
      "stages": {
        "representation": {
          "label": "导入方式",
          "labelKey": "orbit.stage.representation",
          "options": [
            { "id": "photoshop:pixel-layer", "icon": "image", "label": "普通图层", "description": "导入当前 Photoshop 文档并转为普通像素图层", "set": { "storage.action": "save-and-import", "ae.target": "none", "host.representation": "pixel-layer" }, "complete": true, "requires": "document", "unavailableReason": "Photoshop 没有打开的文档" },
            { "id": "photoshop:smart-object", "icon": "file", "label": "智能对象", "description": "导入当前 Photoshop 文档并保留为智能对象", "set": { "storage.action": "save-and-import", "ae.target": "none", "host.representation": "smart-object" }, "complete": true, "requires": "document", "unavailableReason": "Photoshop 没有打开的文档" }
          ]
        }
      }
    }
  }
}
;
