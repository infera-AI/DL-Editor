import { createContext, useContext } from "react";

const ApplicationContext = createContext(null);

function useApplicationContext() {
  const model = useContext(ApplicationContext);
  if (!model) throw new Error("ApplicationContext is missing");
  return model;
}

export { ApplicationContext, useApplicationContext };
