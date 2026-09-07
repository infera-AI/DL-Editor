import { PlaceholderPage } from "../components/PlaceholderPage.jsx";
import { CloudRepository } from "../pages/cloud/CloudPage.jsx";
import { DelphiPage } from "../pages/delphi/DelphiPage.jsx";
import { EditorPage } from "../pages/editor/EditorPage.jsx";
import { EnginePage } from "../pages/engine/EnginePage.jsx";
import { GuessPage } from "../pages/guess/GuessPage.jsx";
import { ResearchPage } from "../pages/research/ResearchPage.jsx";
import { useApplicationContext } from "./ApplicationContext.jsx";

function PageContent() {
  const {
    activeNav,
    authState,
    cloudSpaceId,
    cloudRepositoryDateKey,
    cloudRepositoryMediaFilterId,
    cloudRepositoryStatusFilterId,
    deleteCloudRepositoryItem,
    setCloudRepositoryMediaFilterId,
    setCloudRepositoryStatusFilterId,
    setCloudRepositoryDateKey,
    setShowLogin,
    loadCloudRepository,
    changeCloudSpace,
    repositoryState,
    loadGuesses,
    respondToGuess,
    setGuessState,
    guessState,
    researchAccessState,
    researchFilters,
    exportFilteredResearchChats,
    exportFilteredResearchResources,
    exportSelectedResearchChats,
    exportSelectedResearchResources,
    updateResearchFilter,
    loadMoreResearchChats,
    loadMoreResearchResources,
    loadResearchData,
    researchTab,
    loadResearchAccess,
    selectLoadedResearchChats,
    selectLoadedResearchResources,
    setResearchTab,
    toggleResearchChat,
    toggleResearchResource,
    researchState,
  } = useApplicationContext();

  return activeNav === "Editor" ? (
    <EditorPage />
  ) : activeNav === "Cloud" ? (
    <CloudRepository
      authState={authState}
      cloudSpaceId={cloudSpaceId}
      cloudRepositoryDateKey={cloudRepositoryDateKey}
      cloudRepositoryMediaFilterId={cloudRepositoryMediaFilterId}
      cloudRepositoryStatusFilterId={cloudRepositoryStatusFilterId}
      onDeleteItem={deleteCloudRepositoryItem}
      onMediaFilterChange={setCloudRepositoryMediaFilterId}
      onStatusFilterChange={setCloudRepositoryStatusFilterId}
      onRepositoryDateChange={setCloudRepositoryDateKey}
      onLogin={() => setShowLogin(true)}
      onRefresh={(spaceId = cloudSpaceId) =>
        loadCloudRepository(
          authState,
          spaceId,
          cloudRepositoryDateKey,
          cloudRepositoryStatusFilterId,
        )
      }
      onSpaceChange={changeCloudSpace}
      repositoryState={repositoryState}
    />
  ) : activeNav === "Delphi" ? (
    <DelphiPage />
  ) : activeNav === "Guess" ? (
    <GuessPage
      authState={authState}
      onLogin={() => setShowLogin(true)}
      onRefresh={() => loadGuesses(authState)}
      onRespond={respondToGuess}
      onSelect={(guessId) =>
        setGuessState((current) => ({
          ...current,
          selectedId: guessId,
          notice: "",
        }))
      }
      state={guessState}
    />
  ) : activeNav === "Engine" ? (
    <EnginePage />
  ) : activeNav === "Research" ? (
    <ResearchPage
      accessState={researchAccessState}
      authState={authState}
      filters={researchFilters}
      onExportFilteredChats={exportFilteredResearchChats}
      onExportFilteredResources={exportFilteredResearchResources}
      onExportSelectedChats={exportSelectedResearchChats}
      onExportSelectedResources={exportSelectedResearchResources}
      onFilterChange={updateResearchFilter}
      onLogin={() => setShowLogin(true)}
      onLoadMoreChats={loadMoreResearchChats}
      onLoadMoreResources={loadMoreResearchResources}
      onRefresh={() =>
        loadResearchData(researchTab, authState, researchFilters)
      }
      onRetryAccess={() => loadResearchAccess(authState)}
      onSelectLoadedChats={selectLoadedResearchChats}
      onSelectLoadedResources={selectLoadedResearchResources}
      onTabChange={setResearchTab}
      onToggleChat={toggleResearchChat}
      onToggleResource={toggleResearchResource}
      state={researchState}
      tab={researchTab}
    />
  ) : (
    <PlaceholderPage title={activeNav} />
  );
}

export { PageContent };
