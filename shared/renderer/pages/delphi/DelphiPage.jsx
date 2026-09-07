import { useApplicationContext } from "../../app/ApplicationContext.jsx";
import { ConversationWorkspace } from "../../features/conversation/ConversationWorkspace.jsx";

function DelphiPage() {
  const { authState, setShowLogin } = useApplicationContext();

  return (
    <ConversationWorkspace
      allowModeSwitch
      authState={authState}
      onLogin={() => setShowLogin(true)}
      queryMode="plain"
      subtitle="Memory conversation"
      title="Delphi"
    />
  );
}

export { DelphiPage };
