import { useState } from "react";

function useEditorState() {
  const [jobs, setJobs] = useState([]);

  const [fpsPreset, setFpsPreset] = useState(2);

  const [customFps, setCustomFps] = useState("");

  const [resolutionPreset, setResolutionPreset] = useState("720p");

  const [customWidth, setCustomWidth] = useState("");

  const [customHeight, setCustomHeight] = useState("");

  const [useSourceResolution, setUseSourceResolution] = useState(false);

  const [processingDevice, setProcessingDevice] = useState("gpu");

  const [outputDirectory, setOutputDirectory] = useState("");

  const [capabilities, setCapabilities] = useState(null);

  const [systemUsage, setSystemUsage] = useState(null);

  const [batchState, setBatchState] = useState({ status: "idle" });

  const [pauseTransitioning, setPauseTransitioning] = useState(false);

  const [startTimeEditor, setStartTimeEditor] = useState(null);

  return { jobs, setJobs, fpsPreset, setFpsPreset, customFps, setCustomFps, resolutionPreset, setResolutionPreset, customWidth, setCustomWidth, customHeight, setCustomHeight, useSourceResolution, setUseSourceResolution, processingDevice, setProcessingDevice, outputDirectory, setOutputDirectory, capabilities, setCapabilities, systemUsage, setSystemUsage, batchState, setBatchState, pauseTransitioning, setPauseTransitioning, startTimeEditor, setStartTimeEditor };
}

export { useEditorState };
