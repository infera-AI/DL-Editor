import { ApplicationContext } from "./ApplicationContext.jsx";
import { ApplicationShell } from "./ApplicationShell.jsx";
import { useApplication } from "./useApplication.js";

function App() {
  const model = useApplication();
  return (
    <ApplicationContext.Provider value={model}>
      <ApplicationShell />
    </ApplicationContext.Provider>
  );
}

export default App;
