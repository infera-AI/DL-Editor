# 迁移对照表

基线提交：`524955a612c4c96b647f39f30be09036c9645305`。原 Windows/Mac `App.jsx` 内容相同；下表行号均指基线版本。

可用 `git show 524955a612c4c96b647f39f30be09036c9645305:Windows/src/renderer/App.jsx` 查看旧源码。

页面组装 JSX（原 4121–4484 行）拆至 `app/ApplicationShell.jsx`、`app/PageContent.jsx`、`app/AppOverlays.jsx`、`app/Chrome.jsx` 和 Editor/Delphi/Engine 页面入口。原 `App` 的组合入口为 `app/App.jsx` 与 `app/useApplication.js`。

原 `ResearchEvidenceList` / `ResearchEvidenceCard` 更名为 `EvidenceList` / `EvidenceCard`；函数体行为与原 CSS 类名保留。其余迁移函数保留原名称，便于追踪现有行为。

| 新文件 | 迁移的定义/控制器 | 原 App.jsx 行号 |
| --- | --- | --- |
| [app/App.jsx](../shared/renderer/app/App.jsx) | `App` | 2002-4485 |
| [app/AppChrome.jsx](../shared/renderer/app/AppChrome.jsx) | `AppChrome` | 8754-8827 |
| [app/AppInfoDialog.jsx](../shared/renderer/app/AppInfoDialog.jsx) | `AppInfoDialog` | 8829-8904 |
| [app/config.js](../shared/renderer/app/config.js) | `APP_NAME`、`APP_INFO` | 57-57; 251-257 |
| [app/navigation.js](../shared/renderer/app/navigation.js) | `NAV_ITEMS` | 78-78 |
| [app/session.actions.js](../shared/renderer/app/session.actions.js) | `createSessionActions` | 3541-3567, 3603-3622 |
| [app/shell.actions.js](../shared/renderer/app/shell.actions.js) | `createShellActions` | 3368-3380, 3382-3395, 3397-3404 |
| [app/SplashScreen.jsx](../shared/renderer/app/SplashScreen.jsx) | `SplashScreen` | 8504-8516 |
| [app/theme.constants.js](../shared/renderer/app/theme.constants.js) | `THEME_STORAGE_KEY`、`LEGACY_THEME_STORAGE_KEY` | 58-58; 59-59 |
| [app/update.utils.js](../shared/renderer/app/update.utils.js) | `getUpdateMessage` | 8906-8924 |
| [app/useDesktopEvents.js](../shared/renderer/app/useDesktopEvents.js) | `useDesktopEvents` | 2129-2207 |
| [app/useShellState.js](../shared/renderer/app/useShellState.js) | `useShellState` | 2015-2015, 2016-2016, 2018-2023, 2024-2024, 2025-2025, 2026-2026, 2027-2027, 2115-2115, 2116-2116 |
| [app/useSplashEffect.js](../shared/renderer/app/useSplashEffect.js) | `useSplashEffect` | 2304-2307 |
| [app/useTaskClock.js](../shared/renderer/app/useTaskClock.js) | `useTaskClock` | 2395-2405 |
| [app/useThemeEffects.js](../shared/renderer/app/useThemeEffects.js) | `useThemeEffects` | 2209-2211, 2213-2217 |
| [components/DurationValue.jsx](../shared/renderer/components/DurationValue.jsx) | `DurationValue` | 10445-10453 |
| [components/Metric.jsx](../shared/renderer/components/Metric.jsx) | `Metric` | 9023-9031 |
| [components/PlaceholderPage.jsx](../shared/renderer/components/PlaceholderPage.jsx) | `PlaceholderPage` | 4487-4493 |
| [features/auth/auth.actions.js](../shared/renderer/features/auth/auth.actions.js) | `createAuthActions` | 3426-3449, 3451-3478, 3480-3501, 3503-3539, 3569-3575, 3577-3582, 3584-3592, 3594-3601 |
| [features/auth/auth.api.js](../shared/renderer/features/auth/auth.api.js) | `loginToInfera`、`loginToInferaWithEmailCode`、`sendEmailVerificationCode`、`createEmailVerificationToken`、`registerWithInfera`、`fetchCurrentUser` | 812-823; 825-833; 835-844; 846-856; 858-867; 869-871 |
| [features/auth/auth.constants.js](../shared/renderer/features/auth/auth.constants.js) | `AUTH_STORAGE_KEY`、`EMAIL_IDENTIFIER_PATTERN`、`PHONE_IDENTIFIER_PATTERN` | 60-60; 320-320; 321-321 |
| [features/auth/auth.storage.js](../shared/renderer/features/auth/auth.storage.js) | `readStoredAuth` | 323-330 |
| [features/auth/auth.utils.js](../shared/renderer/features/auth/auth.utils.js) | `inferIdentifierType`、`getAuthenticationErrorMessage`、`getAuthDisplayName`、`getAuthAccountName`、`getAuthInitial` | 393-398; 400-412; 10082-10085; 10087-10091; 10093-10098 |
| [features/auth/LoginDialog.jsx](../shared/renderer/features/auth/LoginDialog.jsx) | `LoginDialog` | 8518-8752 |
| [features/auth/useAuthEffects.js](../shared/renderer/features/auth/useAuthEffects.js) | `useAuthEffects` | 2219-2224, 2226-2232, 2234-2276 |
| [features/auth/useAuthState.js](../shared/renderer/features/auth/useAuthState.js) | `useAuthState` | 2031-2031, 2032-2032, 2033-2033, 2034-2034, 2035-2035, 2036-2036, 2061-2061, 2064-2064 |
| [features/conversation/conversation.api.js](../shared/renderer/features/conversation/conversation.api.js) | `fetchConversationQueryModes`、`buildConversationPath`、`fetchConversationSessions`、`fetchConversationSession`、`createConversationStreamId`、`createConversationRequestId`、`streamConversationInput` | 186-186; 1640-1643; 1645-1647; 1649-1654; 1656-1658; 1660-1662; 1664-1727 |
| [features/conversation/conversation.utils.js](../shared/renderer/features/conversation/conversation.utils.js) | `getConversationTitle`、`formatConversationTime` | 4782-4784; 4786-4796 |
| [features/conversation/ConversationMessage.jsx](../shared/renderer/features/conversation/ConversationMessage.jsx) | `ConversationMessage` | 5232-5250 |
| [features/conversation/ConversationStreamTurn.jsx](../shared/renderer/features/conversation/ConversationStreamTurn.jsx) | `ConversationStreamTurn` | 5252-5271 |
| [features/conversation/ConversationWorkspace.jsx](../shared/renderer/features/conversation/ConversationWorkspace.jsx) | `ConversationWorkspace` | 4798-5230 |
| [features/evidence/evidence.api.js](../shared/renderer/features/evidence/evidence.api.js) | `resolveResearchEvidenceUrl`、`resolveConversationEvidenceUrl` | 1964-1983; 1985-2000 |
| [features/evidence/evidence.utils.js](../shared/renderer/features/evidence/evidence.utils.js) | `getResearchEvidenceKind`、`formatResearchEvidenceOffset`、`getResearchEvidenceTimeLabel` | 1934-1943; 1945-1954; 1956-1962 |
| [features/evidence/EvidenceCard.jsx](../shared/renderer/features/evidence/EvidenceCard.jsx) | `EvidenceCard` | 7380-7414 |
| [features/evidence/EvidenceList.jsx](../shared/renderer/features/evidence/EvidenceList.jsx) | `EvidenceList` | 7369-7378 |
| [features/transfers/automation.actions.js](../shared/renderer/features/transfers/automation.actions.js) | `createAutomationActions` | 2464-2469, 2489-2550, 2552-2559, 2561-2585 |
| [features/transfers/components/AutomationOptions.jsx](../shared/renderer/features/transfers/components/AutomationOptions.jsx) | `AutomationOptions` | 9033-9056 |
| [features/transfers/components/TransferQueueItem.jsx](../shared/renderer/features/transfers/components/TransferQueueItem.jsx) | `TransferQueueItem` | 9144-9205 |
| [features/transfers/components/UploadQueueDock.jsx](../shared/renderer/features/transfers/components/UploadQueueDock.jsx) | `UploadQueueDock` | 9058-9142 |
| [features/transfers/queue.actions.js](../shared/renderer/features/transfers/queue.actions.js) | `createTransferQueueActions` | 2587-2629, 2631-2637, 2639-2656, 2658-2687, 2689-2697, 2699-2766, 2768-2837, 2863-2867 |
| [features/transfers/transfer-job.js](../shared/renderer/features/transfers/transfer-job.js) | `createUploadItems`、`isJobReadyForUpload`、`isLowFrameRateJob`、`getJobUploadPath`、`getUploadFileName`、`getProcessedStyleFileName` | 9207-9219; 9724-9726; 9728-9731; 9733-9739; 9786-9796; 9798-9805 |
| [features/transfers/transfer-progress.js](../shared/renderer/features/transfers/transfer-progress.js) | `applyUploadProgress`、`getNextUploadStatus`、`normalizeUploadProgressMessage`、`getUploadOverallPercent`、`formatUploadBytes`、`getUploadItemElapsedMs`、`getUploadEstimatedRemainingMs`、`getUploadItemRemainingMs`、`getUploadCurrentSpeed`、`formatUploadSpeed` | 9517-9574; 9576-9590; 9592-9602; 9604-9611; 9613-9617; 9619-9637; 9639-9665; 9667-9685; 9687-9694; 9696-9698 |
| [features/transfers/transfer-queue.js](../shared/renderer/features/transfers/transfer-queue.js) | `createTransferTask`、`getTransferUploadPath`、`getManualDelphiUploadValidationError`、`getManualDelphiUploadErrorMessage`、`createJobFromTransferTask`、`getTransferTaskUploadOptions`、`getPendingAutomationTransferKinds`、`getNextTransferTask`、`isTransferStartable`、`isTransferRestartable`、`sortTransferQueue`、`applyTransferProgress` | 9221-9258; 9260-9262; 9264-9277; 9279-9283; 9285-9302; 9304-9313; 9315-9328; 9330-9332; 9334-9336; 9338-9340; 9342-9363; 9365-9396 |
| [features/transfers/transfer-status.js](../shared/renderer/features/transfers/transfer-status.js) | `createTransferFailureSnapshot`、`getUploadDoneMessage`、`getUploadHistoryDoneMessage`、`getTransferSuccessPatch`、`isUploadActive`、`isUploadPausable`、`getTransferErrorStatus`、`isTransferErrorStatus`、`markUploadItem`、`getProcessingDoneMessage`、`formatJobTransferStatusLabel` | 9405-9425; 9427-9437; 9439-9448; 9450-9492; 9494-9496; 9498-9500; 9502-9504; 9506-9508; 9510-9515; 9756-9769; 10431-10443 |
| [features/transfers/transfer.constants.js](../shared/renderer/features/transfers/transfer.constants.js) | `AUTOMATION_STORAGE_KEY`、`TRANSFER_QUEUE_STORAGE_KEY`、`WEB_VIDEO_UPLOAD_PATH`、`RAW_DATA_VIDEO_UPLOAD_PATH`、`DELPHI_UPLOAD_MAX_BYTES`、`DELPHI_UPLOAD_FILE_NAME_PATTERN`、`DELPHI_UPLOAD_VALIDATION_MESSAGES`、`DEFAULT_AUTOMATION_OPTIONS`、`UPLOAD_STATUS_LABELS` | 61-61; 62-62; 65-65; 67-67; 68-68; 69-69; 70-73; 199-203; 238-249 |
| [features/transfers/transfer.storage.js](../shared/renderer/features/transfers/transfer.storage.js) | `readStoredAutomationOptions`、`readStoredTransferQueue`、`writeStoredTransferQueue`、`normalizeStoredTransferTask` | 332-339; 341-351; 353-360; 362-391 |
| [features/transfers/upload.actions.js](../shared/renderer/features/transfers/upload.actions.js) | `createUploadActions` | 2839-2861, 2869-2874, 2876-2880, 2882-3125, 3127-3139, 3141-3194, 3196-3218 |
| [features/transfers/useTransferDerivedState.js](../shared/renderer/features/transfers/useTransferDerivedState.js) | `useTransferDerivedState` | 2124-2124, 2125-2125, 2126-2126, 2127-2127 |
| [features/transfers/useTransferEffects.js](../shared/renderer/features/transfers/useTransferEffects.js) | `useTransferEffects` | 2278-2281, 2283-2285, 2287-2290, 2292-2293, 2295-2302 |
| [features/transfers/useTransferState.js](../shared/renderer/features/transfers/useTransferState.js) | `useTransferState` | 2041-2041, 2042-2051, 2052-2052, 2053-2053, 2054-2054, 2055-2055, 2056-2056, 2057-2057, 2058-2058, 2059-2059, 2060-2060, 2062-2062, 2063-2063 |
| [hooks/useResearchLazyLoad.js](../shared/renderer/hooks/useResearchLazyLoad.js) | `useResearchLazyLoad` | 1807-1833 |
| [pages/cloud/cloud-query.js](../shared/renderer/pages/cloud/cloud-query.js) | `buildCloudRepositoryPagePath`、`getCloudRepositoryParseStatusParam`、`getCloudRepositoryDateRange`、`normalizeCloudItems` | 915-940; 942-953; 955-973; 1007-1014 |
| [pages/cloud/cloud.actions.js](../shared/renderer/pages/cloud/cloud.actions.js) | `createCloudActions` | 3406-3424, 3873-3958, 3960-3989 |
| [pages/cloud/cloud.api.js](../shared/renderer/pages/cloud/cloud.api.js) | `fetchCloudRepository`、`deleteRawDataArchive` | 880-913; 1016-1031 |
| [pages/cloud/cloud.constants.js](../shared/renderer/pages/cloud/cloud.constants.js) | `RAW_DATA_LIST_PATH`、`CLOUD_REPOSITORY_PAGE_SIZE`、`CLOUD_REPOSITORY_MAX_PAGES`、`CLOUD_REPOSITORY_DEFAULT_MEDIA_FILTER_ID`、`CLOUD_REPOSITORY_DEFAULT_STATUS_FILTER_ID`、`CLOUD_FILTERS`、`CLOUD_VIEW_MODES`、`CLOUD_SPACES` | 66-66; 74-74; 75-75; 76-76; 77-77; 221-229; 230-230; 231-234 |
| [pages/cloud/cloud.utils.js](../shared/renderer/pages/cloud/cloud.utils.js) | `getCloudMediaFiltersForSpace`、`getCloudStatusFiltersForSpace`、`getDefaultCloudMediaFilterIdForSpace`、`getDefaultCloudStatusFilterIdForSpace`、`getCloudStatusFilterIdForSpace`、`getRepositoryItemKey`、`getRepositoryStableItemKey`、`getRepositoryActionMenuPosition`、`getRawDataId`、`getRawDataStorageStatus`、`formatRawDataStorageStatus`、`getRepositoryTitle`、`getRepositoryType`、`isRepositoryParsed`、`isRepositoryProcessing`、`isRepositoryParseFailed`、`getRepositoryParseStatus`、`getCloudRepositoryStats`、`getCloudFilterCount`、`filterCloudRepositoryItems` | 9823-9825; 9827-9833; 9835-9837; 9839-9841; 9843-9849; 9851-9853; 9855-9857; 9859-9874; 9876-9878; 9880-9896; 9898-9910; 9912-9914; 9916-9923; 9925-9927; 9929-9933; 9935-9937; 9939-9941; 9943-9965; 9967-9974; 9976-10008 |
| [pages/cloud/CloudPage.jsx](../shared/renderer/pages/cloud/CloudPage.jsx) | `CloudRepository` | 8043-8401 |
| [pages/cloud/components/CloudFilterIcon.jsx](../shared/renderer/pages/cloud/components/CloudFilterIcon.jsx) | `CloudFilterIcon` | 8403-8410 |
| [pages/cloud/components/CloudMetric.jsx](../shared/renderer/pages/cloud/components/CloudMetric.jsx) | `CloudMetric` | 8412-8420 |
| [pages/cloud/components/RepositoryFileIcon.jsx](../shared/renderer/pages/cloud/components/RepositoryFileIcon.jsx) | `RepositoryFileIcon` | 8492-8502 |
| [pages/cloud/components/RepositoryGridCard.jsx](../shared/renderer/pages/cloud/components/RepositoryGridCard.jsx) | `RepositoryGridCard` | 8426-8449 |
| [pages/cloud/components/RepositoryItem.jsx](../shared/renderer/pages/cloud/components/RepositoryItem.jsx) | `RepositoryItem` | 8422-8424 |
| [pages/cloud/components/RepositoryTableRow.jsx](../shared/renderer/pages/cloud/components/RepositoryTableRow.jsx) | `RepositoryTableRow` | 8451-8490 |
| [pages/cloud/repository-format.js](../shared/renderer/pages/cloud/repository-format.js) | `formatRepositoryDuration`、`getRepositorySizeBytes`、`getRepositoryDurationSeconds`、`getRepositoryUploadTime`、`getRepositoryCapturedTime`、`getRepositoryContentSource`、`parseRepositoryCapturedTimestampFromName`、`formatRepositoryStatus` | 10116-10119; 10121-10124; 10126-10177; 10179-10181; 10183-10205; 10207-10213; 10215-10238; 10283-10295 |
| [pages/cloud/useCloudEffects.js](../shared/renderer/pages/cloud/useCloudEffects.js) | `useCloudEffects` | 2309-2332 |
| [pages/cloud/useCloudState.js](../shared/renderer/pages/cloud/useCloudState.js) | `useCloudState` | 2037-2037, 2038-2038, 2039-2039, 2040-2040, 2067-2079 |
| [pages/editor/components/DeviceStatus.jsx](../shared/renderer/pages/editor/components/DeviceStatus.jsx) | `DeviceStatus` | 8926-8963 |
| [pages/editor/components/QueueItem.jsx](../shared/renderer/pages/editor/components/QueueItem.jsx) | `QueueItem` | 10354-10429 |
| [pages/editor/components/StartTimeDialog.jsx](../shared/renderer/pages/editor/components/StartTimeDialog.jsx) | `StartTimeDialog` | 10297-10352 |
| [pages/editor/components/UsageCard.jsx](../shared/renderer/pages/editor/components/UsageCard.jsx) | `UsageCard` | 8965-9021 |
| [pages/editor/editor.actions.js](../shared/renderer/pages/editor/editor.actions.js) | `createEditorActions` | 2449-2462, 2471-2487, 3220-3225, 3227-3270, 3272-3274, 3276-3321, 3323-3325, 3327-3329, 3331-3339, 3341-3354, 3356-3366 |
| [pages/editor/editor.constants.js](../shared/renderer/pages/editor/editor.constants.js) | `FPS_PRESETS`、`RESOLUTION_PRESETS`、`STATUS_LABELS` | 204-204; 205-210; 212-219 |
| [pages/editor/editor.utils.js](../shared/renderer/pages/editor/editor.utils.js) | `getActiveEncodingJob`、`formatEncodingSpeed`、`canClearFinishedJob`、`canRemoveJob`、`getProcessingOutputActionPath`、`getQueueItemFooterMessage`、`getElapsedMs`、`getEstimatedRemainingMs` | 9700-9706; 9708-9722; 9741-9743; 9745-9747; 9749-9754; 9771-9776; 10471-10481; 10483-10509 |
| [pages/editor/useEditorDerivedState.js](../shared/renderer/pages/editor/useEditorDerivedState.js) | `useEditorDerivedState` | 2118-2118, 2119-2119, 2120-2120, 2121-2121, 2122-2122, 2123-2123, 2407-2423, 2425-2425, 2426-2426, 2427-2427, 2429-2440, 2442-2447 |
| [pages/editor/useEditorState.js](../shared/renderer/pages/editor/useEditorState.js) | `useEditorState` | 2003-2003, 2004-2004, 2005-2005, 2006-2006, 2007-2007, 2008-2008, 2009-2009, 2010-2010, 2011-2011, 2012-2012, 2013-2013, 2014-2014, 2017-2017, 2114-2114 |
| [pages/engine/components/EngineGate.jsx](../shared/renderer/pages/engine/components/EngineGate.jsx) | `EngineGate` | 4495-4533 |
| [pages/engine/components/EngineIndexResult.jsx](../shared/renderer/pages/engine/components/EngineIndexResult.jsx) | `EngineIndexResult` | 5846-5875 |
| [pages/engine/components/EngineMediaPreview.jsx](../shared/renderer/pages/engine/components/EngineMediaPreview.jsx) | `EngineMediaPreview` | 4717-4780 |
| [pages/engine/components/EngineQueryEntryBody.jsx](../shared/renderer/pages/engine/components/EngineQueryEntryBody.jsx) | `EngineQueryEntryBody` | 6154-6276 |
| [pages/engine/components/EngineQueryPanel.jsx](../shared/renderer/pages/engine/components/EngineQueryPanel.jsx) | `EngineQueryPanel` | 5964-5996 |
| [pages/engine/components/EngineSearchEntryBody.jsx](../shared/renderer/pages/engine/components/EngineSearchEntryBody.jsx) | `EngineSearchEntryBody` | 5909-5937 |
| [pages/engine/components/EngineSearchHit.jsx](../shared/renderer/pages/engine/components/EngineSearchHit.jsx) | `EngineSearchHit` | 5939-5962 |
| [pages/engine/components/EngineSearchPanel.jsx](../shared/renderer/pages/engine/components/EngineSearchPanel.jsx) | `EngineSearchPanel` | 5877-5907 |
| [pages/engine/components/EngineTestView.jsx](../shared/renderer/pages/engine/components/EngineTestView.jsx) | `EngineTestView` | 5764-5844 |
| [pages/engine/components/EngineWorkspace.jsx](../shared/renderer/pages/engine/components/EngineWorkspace.jsx) | `EngineWorkspace` | 5273-5762 |
| [pages/engine/engine-progress.js](../shared/renderer/pages/engine/engine-progress.js) | `getEngineQueryStageLabel`、`getEngineLlmStatusLabel`、`getEnginePlannerStatusLabel`、`getEngineEvidenceStatusLabel`、`getEngineReasoningStepLabel`、`getEngineSupportLabel` | 5998-6025; 6027-6041; 6043-6094; 6096-6120; 6122-6135; 6137-6152 |
| [pages/engine/engine.actions.js](../shared/renderer/pages/engine/engine.actions.js) | `createEngineActions` | 4104-4113, 4115-4119 |
| [pages/engine/engine.api.js](../shared/renderer/pages/engine/engine.api.js) | `DL_ENGINE_API_BASE_URL`、`resolveEngineUrl`、`requestEngine`、`createEngineQaStreamId`、`streamEngineQa`、`mergeEngineQaResponse`、`nonEmptyEngineAnswer` | 64-64; 673-687; 689-720; 722-724; 726-767; 769-771; 773-775 |
| [pages/engine/engine.constants.js](../shared/renderer/pages/engine/engine.constants.js) | `ENGINE_PASSWORD`、`ENGINE_HEALTH_RETRY_MS`、`ENGINE_INDEX_QUERY`、`ENGINE_INDEX_HITS` | 180-180; 235-235; 236-236; 237-237 |
| [pages/engine/engine.utils.js](../shared/renderer/pages/engine/engine.utils.js) | `getEngineErrorMessage`、`getEngineStatusLabel`、`getEngineStatusDetail`、`formatEngineTimeRange`、`getEngineSourceLabel`、`getEngineConfidenceLabel`、`getEngineEvidenceCountLabel`、`getEngineSearchSupport`、`getEnginePlanSummary`、`getEngineEntryStatusLabel`、`getEngineIndexResults`、`getEngineIndexResultKey`、`getEngineIndexContentText`、`formatEngineJson`、`getEngineRawRefFromReferences`、`getEngineMediaSeconds`、`formatEngineMediaOffset`、`getEngineMediaSegmentLabel`、`buildEngineMediaUrl` | 4535-4541; 4543-4548; 4550-4556; 4558-4572; 4574-4586; 4588-4596; 4598-4600; 4602-4604; 4606-4616; 4618-4623; 4625-4636; 4638-4640; 4642-4653; 4655-4661; 4663-4671; 4673-4676; 4678-4684; 4686-4697; 4699-4715 |
| [pages/engine/useEngineState.js](../shared/renderer/pages/engine/useEngineState.js) | `useEngineState` | 2028-2028, 2029-2029, 2030-2030 |
| [pages/guess/components/GuessChoiceChips.jsx](../shared/renderer/pages/guess/components/GuessChoiceChips.jsx) | `GuessChoiceChips` | 7587-7607 |
| [pages/guess/components/GuessListButton.jsx](../shared/renderer/pages/guess/components/GuessListButton.jsx) | `GuessListButton` | 8027-8041 |
| [pages/guess/components/GuessValueEditor.jsx](../shared/renderer/pages/guess/components/GuessValueEditor.jsx) | `GuessValueEditor` | 7609-7656 |
| [pages/guess/components/GuessValueView.jsx](../shared/renderer/pages/guess/components/GuessValueView.jsx) | `GuessValueView` | 7573-7585 |
| [pages/guess/guess-value.js](../shared/renderer/pages/guess/guess-value.js) | `isGuessConflictError`、`isVisibleGuess`、`isGuessTextValue`、`isSimpleGuessValue`、`isPrimitiveGuessPart`、`getGuessListValueKey`、`extractGuessItemPart`、`toGuessClaimValue`、`normalizeGuessTokenKey`、`formatGuessToken`、`uniqueGuessTokens`、`splitGuessDraftList`、`canonicalizeGuessToken`、`parseGuessBoolean`、`getGuessValueTokens`、`formatGuessValue`、`indexGuessRegistry`、`collectRegistryCommonValues`、`getGuessChoiceOptions`、`getGuessDraftConfig`、`getGuessDraftError`、`parseGuessValueDraft`、`displayGuessDraftField` | 1252-1262; 1264-1266; 1268-1272; 1274-1278; 1280-1282; 1284-1290; 1292-1301; 1303-1316; 1318-1323; 1325-1336; 1338-1351; 1353-1359; 1361-1376; 1378-1383; 1385-1402; 1404-1406; 1408-1414; 1416-1426; 1428-1440; 1442-1455; 1457-1479; 1481-1515; 7561-7571 |
| [pages/guess/guess.actions.js](../shared/renderer/pages/guess/guess.actions.js) | `createGuessActions` | 3991-4047, 4049-4102 |
| [pages/guess/guess.api.js](../shared/renderer/pages/guess/guess.api.js) | `fetchLongTermMemoryGuesses`、`fetchLongTermMemoryRegistry`、`fetchLongTermMemoryItem`、`respondToLongTermMemoryGuess` | 1616-1621; 1623-1625; 1627-1629; 1631-1638 |
| [pages/guess/guess.constants.js](../shared/renderer/pages/guess/guess.constants.js) | `GUESS_VISIBLE_STATUSES`、`GUESS_PAGE_SIZE`、`GUESS_LIST_PATH`、`GUESS_ITEMS_PATH`、`GUESS_REGISTRY_PATH`、`GUESS_STATUS_FILTERS`、`GUESS_TIME_FILTERS`、`GUESS_VALUE_LABELS`、`GUESS_ENUM_OPTIONS_BY_KEY`、`GUESS_TOKEN_FAMILIES` | 79-79; 80-80; 81-81; 82-82; 83-83; 84-89; 90-96; 97-153; 154-167; 168-179 |
| [pages/guess/guess.utils.js](../shared/renderer/pages/guess/guess.utils.js) | `getGuessStatusLabel`、`getGuessStatusRank`、`getGuessTimestamp`、`formatGuessDate`、`sortGuessItems`、`getLocalDayStartMs`、`getGuessTimeRange`、`matchesGuessStatusFilter`、`matchesGuessTimeFilter`、`filterGuessItems`、`getGuessPreview`、`selectGuessAfterRemoval` | 1517-1522; 1524-1529; 1531-1537; 1539-1548; 1550-1556; 1558-1563; 1565-1584; 1586-1590; 1592-1598; 1600-1602; 1604-1607; 1609-1614 |
| [pages/guess/GuessPage.jsx](../shared/renderer/pages/guess/GuessPage.jsx) | `GuessPage` | 7658-8025 |
| [pages/guess/useGuessEffects.js](../shared/renderer/pages/guess/useGuessEffects.js) | `useGuessEffects` | 2334-2340 |
| [pages/guess/useGuessState.js](../shared/renderer/pages/guess/useGuessState.js) | `useGuessState` | 2066-2066, 2104-2113 |
| [pages/research/components/ResearchBatchExportModal.jsx](../shared/renderer/pages/research/components/ResearchBatchExportModal.jsx) | `ResearchBatchExportModal` | 6635-6742 |
| [pages/research/components/ResearchChatCard.jsx](../shared/renderer/pages/research/components/ResearchChatCard.jsx) | `ResearchChatCard` | 7233-7267 |
| [pages/research/components/ResearchChatDetail.jsx](../shared/renderer/pages/research/components/ResearchChatDetail.jsx) | `ResearchChatDetail` | 7316-7345 |
| [pages/research/components/ResearchChatMessage.jsx](../shared/renderer/pages/research/components/ResearchChatMessage.jsx) | `ResearchChatMessage` | 7347-7367 |
| [pages/research/components/ResearchChats.jsx](../shared/renderer/pages/research/components/ResearchChats.jsx) | `ResearchChats` | 7269-7300 |
| [pages/research/components/ResearchChatsView.jsx](../shared/renderer/pages/research/components/ResearchChatsView.jsx) | `ResearchChatsView` | 7177-7231 |
| [pages/research/components/ResearchExportAllModal.jsx](../shared/renderer/pages/research/components/ResearchExportAllModal.jsx) | `ResearchExportAllModal` | 6592-6633 |
| [pages/research/components/ResearchFeedbackPreview.jsx](../shared/renderer/pages/research/components/ResearchFeedbackPreview.jsx) | `ResearchFeedbackPreview` | 7302-7314 |
| [pages/research/components/ResearchFilters.jsx](../shared/renderer/pages/research/components/ResearchFilters.jsx) | `ResearchFilters` | 6560-6590 |
| [pages/research/components/ResearchMediaPreview.jsx](../shared/renderer/pages/research/components/ResearchMediaPreview.jsx) | `ResearchMediaPreview` | 7074-7098 |
| [pages/research/components/ResearchParsedList.jsx](../shared/renderer/pages/research/components/ResearchParsedList.jsx) | `ResearchParsedList` | 7125-7141 |
| [pages/research/components/ResearchParsedPanel.jsx](../shared/renderer/pages/research/components/ResearchParsedPanel.jsx) | `ResearchParsedPanel` | 7100-7123 |
| [pages/research/components/ResearchResourceDetail.jsx](../shared/renderer/pages/research/components/ResearchResourceDetail.jsx) | `ResearchResourceDetail` | 7028-7072 |
| [pages/research/components/ResearchResources.jsx](../shared/renderer/pages/research/components/ResearchResources.jsx) | `ResearchResources` | 7143-7175 |
| [pages/research/components/ResearchResourcesView.jsx](../shared/renderer/pages/research/components/ResearchResourcesView.jsx) | `ResearchResourcesView` | 6900-6968 |
| [pages/research/components/ResearchResourceTile.jsx](../shared/renderer/pages/research/components/ResearchResourceTile.jsx) | `ResearchResourceTile` | 6970-6994 |
| [pages/research/components/ResearchSimulationView.jsx](../shared/renderer/pages/research/components/ResearchSimulationView.jsx) | `ResearchSimulationView` | 6744-6898 |
| [pages/research/components/ResearchStatistics.jsx](../shared/renderer/pages/research/components/ResearchStatistics.jsx) | `ResearchStatistics` | 7534-7559 |
| [pages/research/components/ResearchStatisticsModal.jsx](../shared/renderer/pages/research/components/ResearchStatisticsModal.jsx) | `ResearchStatisticsModal` | 7479-7532 |
| [pages/research/components/ResearchStatisticsView.jsx](../shared/renderer/pages/research/components/ResearchStatisticsView.jsx) | `ResearchStatisticsView` | 7416-7477 |
| [pages/research/components/ResearchThumbnail.jsx](../shared/renderer/pages/research/components/ResearchThumbnail.jsx) | `ResearchThumbnail` | 6996-7026 |
| [pages/research/research-download.js](../shared/renderer/pages/research/research-download.js) | `saveResearchDownload` | 10043-10080 |
| [pages/research/research.actions.js](../shared/renderer/pages/research/research.actions.js) | `createResearchActions` | 3624-3673, 3675-3754, 3756-3761, 3763-3768, 3770-3772, 3774-3776, 3778-3780, 3782-3787, 3789-3794, 3796-3798, 3800-3802, 3804-3806, 3808-3810, 3812-3871 |
| [pages/research/research.api.js](../shared/renderer/pages/research/research.api.js) | `getResearchDateRangeParams`、`getResearchListParams`、`fetchResearchUsers`、`fetchResearchResources`、`fetchResearchChats`、`fetchResearchStatistics`、`exportResearchResources`、`exportResearchChats`、`fetchResearchExportCount`、`createResearchDailyExport`、`fetchResearchDailyExport`、`fetchResearchSimulationSessions`、`fetchResearchSimulationSession`、`createResearchSimulationStreamId`、`streamResearchSimulationInput`、`fetchResearchParsedData` | 1043-1060; 1062-1074; 1076-1078; 1080-1085; 1087-1093; 1095-1097; 1099-1106; 1108-1115; 1117-1125; 1127-1133; 1135-1137; 1139-1141; 1143-1148; 1150-1152; 1184-1245; 1835-1838 |
| [pages/research/research.constants.js](../shared/renderer/pages/research/research.constants.js) | `RESEARCH_PAGE_SIZE`、`RESEARCH_RESOURCE_STATUSES` | 181-181; 187-193 |
| [pages/research/research.utils.js](../shared/renderer/pages/research/research.utils.js) | `hasResearchAccess`、`getResearchResourceId`、`getResearchChatId`、`getResearchItemTimestamp`、`isResearchAudio`、`groupResearchResources`、`getResearchFeedbackMessages`、`normalizeResearchFeedbackRating`、`formatResearchDateTime`、`formatResearchShortTime`、`formatResearchLongDuration`、`formatResearchNumber`、`getRecentResearchDateKeys`、`shortResearchDateKey`、`getResearchUserLabel`、`normalizeResearchItems`、`isResearchPermissionDenied`、`getResearchErrorMessage`、`formatResearchDownloadExpiry` | 873-878; 1840-1842; 1844-1846; 1848-1850; 1852-1855; 1857-1873; 1875-1877; 1879-1884; 1886-1890; 1892-1898; 1900-1908; 1910-1912; 1914-1920; 1922-1925; 1927-1932; 10010-10013; 10021-10024; 10026-10035; 10037-10041 |
| [pages/research/ResearchPage.jsx](../shared/renderer/pages/research/ResearchPage.jsx) | `ResearchPage` | 6278-6558 |
| [pages/research/useResearchEffects.js](../shared/renderer/pages/research/useResearchEffects.js) | `useResearchEffects` | 2342-2370, 2372-2393 |
| [pages/research/useResearchState.js](../shared/renderer/pages/research/useResearchState.js) | `useResearchState` | 2065-2065, 2080-2080, 2081-2086, 2087-2087, 2088-2103 |
| [services/auth-payload.js](../shared/renderer/services/auth-payload.js) | `normalizeAuthPayload` | 777-810 |
| [services/desktop.js](../shared/renderer/services/desktop.js) | `dlEditor` | 259-310 |
| [services/infera.js](../shared/renderer/services/infera.js) | `INFERA_API_BASE_URL`、`INFERA_AUTH_EXPIRED_MESSAGE`、`inferaAuthController`、`inferaRefreshPromise`、`unwrapInferaResult`、`resolveInferaUrl`、`createInferaHttpError`、`isInferaUnauthorizedError`、`isInferaAuthEndpoint`、`setInferaAuthController`、`expireInferaAuth`、`mergeRefreshedInferaAuth`、`refreshInferaAuth`、`requestInfera`、`mergeInferaRequestHeaders`、`requestInferaRaw` | 63-63; 185-185; 197-197; 198-198; 414-432; 434-457; 459-468; 470-472; 474-476; 478-485; 487-492; 494-509; 511-548; 550-572; 574-586; 588-671 |
| [services/logging.js](../shared/renderer/services/logging.js) | `logRendererEvent` | 312-318 |
| [services/request-id.js](../shared/renderer/services/request-id.js) | `createInferaIdempotencyKey` | 1247-1250 |
| [services/research-path.js](../shared/renderer/services/research-path.js) | `buildResearchPath` | 1033-1041 |
| [services/signed-urls.js](../shared/renderer/services/signed-urls.js) | `RESEARCH_SIGNED_URL_CACHE_TTL_MS`、`RESEARCH_SIGNED_URL_CACHE_MAX`、`RESEARCH_SIGNED_URL_CONCURRENCY`、`researchSignedUrlCache`、`researchSignedUrlQueue`、`researchSignedUrlActiveCount`、`resolveResearchSignedUrl`、`enqueueResearchSignedUrlRequest`、`pumpResearchSignedUrlQueue`、`trimResearchSignedUrlCache` | 182-182; 183-183; 184-184; 194-194; 195-195; 196-196; 1742-1773; 1775-1780; 1782-1794; 1796-1805 |
| [services/sse.js](../shared/renderer/services/sse.js) | `consumeInferaSseResponse` | 1154-1182 |
| [utils/date.js](../shared/renderer/utils/date.js) | `parseLocalDateBoundary`、`getLocalDateKey`、`shiftLocalDateKey`、`formatTimestampFileName`、`parseTimestampFromFileName`、`buildLocalTimestamp`、`formatRepositoryDate`、`padDatePart`、`normalizeTimestamp`、`getDateParts`、`formatDateTime`、`parseDateTimeParts`、`parseCompactDateTime`、`parseYmd`、`parseHms`、`parseDateTimeFromGroups`、`parseDateTimeFromText` | 975-987; 989-995; 997-1005; 9807-9817; 10240-10258; 10260-10274; 10276-10281; 10533-10535; 10537-10540; 10542-10552; 10554-10557; 10559-10586; 10588-10609; 10611-10615; 10617-10621; 10623-10656; 10658-10678 |
| [utils/download.js](../shared/renderer/utils/download.js) | `getResearchDownloadFilename` | 1729-1740 |
| [utils/errors.js](../shared/renderer/utils/errors.js) | `getShellActionErrorMessage` | 9778-9784 |
| [utils/format.js](../shared/renderer/utils/format.js) | `formatBytes`、`clampPercent`、`percentLabel`、`formatDurationCompact` | 10100-10114; 10455-10461; 10463-10469; 10511-10531 |
| [utils/path.js](../shared/renderer/utils/path.js) | `getFileNameFromPath`、`isSamePath` | 9398-9403; 9819-9821 |
| [utils/selection.js](../shared/renderer/utils/selection.js) | `toggleId` | 10015-10019 |
