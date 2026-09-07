import { getRepositoryType } from "../cloud.utils.js";
import { FileAudio, FileVideo, Folder } from "lucide-react";

function RepositoryFileIcon({ item }) {
  const type = getRepositoryType(item);
  const hasThumbnail = Boolean(item.thumbnail_url);
  const Icon = type === "audio" ? FileAudio : type === "video" ? FileVideo : Folder;

  return (
    <div className={`repository-thumbnail ${type}`} data-has-thumbnail={hasThumbnail ? "true" : undefined}>
      <Icon size={20} />
    </div>
  );
}

export { RepositoryFileIcon };
