import { RepositoryGridCard } from "./RepositoryGridCard.jsx";

function RepositoryItem({ isRawDataSpace, item, onToggleMenu }) {
  return <RepositoryGridCard isRawDataSpace={isRawDataSpace} item={item} onToggleMenu={onToggleMenu} />;
}

export { RepositoryItem };
