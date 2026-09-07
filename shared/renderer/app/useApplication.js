import { createAuthActions } from "../features/auth/auth.actions.js";
import { useAuthEffects } from "../features/auth/useAuthEffects.js";
import { useAuthState } from "../features/auth/useAuthState.js";
import { createAutomationActions } from "../features/transfers/automation.actions.js";
import { createTransferQueueActions } from "../features/transfers/queue.actions.js";
import { createUploadActions } from "../features/transfers/upload.actions.js";
import { useTransferDerivedState } from "../features/transfers/useTransferDerivedState.js";
import { useTransferEffects } from "../features/transfers/useTransferEffects.js";
import { useTransferState } from "../features/transfers/useTransferState.js";
import { createCloudActions } from "../pages/cloud/cloud.actions.js";
import { useCloudEffects } from "../pages/cloud/useCloudEffects.js";
import { useCloudState } from "../pages/cloud/useCloudState.js";
import { createEditorActions } from "../pages/editor/editor.actions.js";
import { useEditorDerivedState } from "../pages/editor/useEditorDerivedState.js";
import { useEditorState } from "../pages/editor/useEditorState.js";
import { createEngineActions } from "../pages/engine/engine.actions.js";
import { useEngineState } from "../pages/engine/useEngineState.js";
import { createGuessActions } from "../pages/guess/guess.actions.js";
import { useGuessEffects } from "../pages/guess/useGuessEffects.js";
import { useGuessState } from "../pages/guess/useGuessState.js";
import { createResearchActions } from "../pages/research/research.actions.js";
import { useResearchEffects } from "../pages/research/useResearchEffects.js";
import { useResearchState } from "../pages/research/useResearchState.js";
import { createSessionActions } from "./session.actions.js";
import { createShellActions } from "./shell.actions.js";
import { useDesktopEvents } from "./useDesktopEvents.js";
import { useShellState } from "./useShellState.js";
import { useSplashEffect } from "./useSplashEffect.js";
import { useTaskClock } from "./useTaskClock.js";
import { useThemeEffects } from "./useThemeEffects.js";

function useApplication() {
  const shell = useShellState();
  const auth = useAuthState();
  const editor = useEditorState();
  const transfers = useTransferState();
  const cloud = useCloudState();
  const research = useResearchState();
  const guess = useGuessState();
  const engine = useEngineState();
  const state = { ...shell, ...auth, ...editor, ...transfers, ...cloud, ...research, ...guess, ...engine };
  const editorDerived = useEditorDerivedState(state);
  const transferDerived = useTransferDerivedState(state);
  const values = { ...state, ...editorDerived, ...transferDerived };

  // Action callbacks resolve after composition, preserving the original render closures.
  // Background state and all effects stay mounted here when a page changes.
  const actions = {};
  Object.assign(actions, createEditorActions(values));
  Object.assign(actions, createAutomationActions({
    ...values,
    scheduleTransferQueueStart: (...args) => actions.scheduleTransferQueueStart(...args)
  }));
  Object.assign(actions, createTransferQueueActions({
    ...values,
    uploadJobsToRepository: (...args) => actions.uploadJobsToRepository(...args)
  }));
  Object.assign(actions, createUploadActions(values));
  Object.assign(actions, createShellActions(values));
  Object.assign(actions, createAuthActions({
    ...values,
    completeAuthentication: (...args) => actions.completeAuthentication(...args)
  }));
  Object.assign(actions, createSessionActions({
    ...values,
    loadCloudRepository: (...args) => actions.loadCloudRepository(...args),
    loadResearchAccess: (...args) => actions.loadResearchAccess(...args)
  }));
  Object.assign(actions, createCloudActions(values));
  Object.assign(actions, createResearchActions(values));
  Object.assign(actions, createGuessActions(values));
  Object.assign(actions, createEngineActions(values));

  const model = { ...values, ...actions };
  useDesktopEvents(model);
  useThemeEffects(model);
  useAuthEffects(model);
  useTransferEffects(model);
  useSplashEffect(model);
  useCloudEffects(model);
  useGuessEffects(model);
  useResearchEffects(model);
  useTaskClock(model);

  return model;
}

export { useApplication };
